'use client';

import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

export default function CostsPage() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['research-history'],
    queryFn: () => api.getResearchHistory(1, 1000),
  });

  // Calculate totals
  const totalCost = history?.results.reduce((sum, s) => sum + (s.cost?.estimated_cost || 0), 0) || 0;
  const totalTokens = history?.results.reduce((sum, s) => sum + (s.token_usage?.total_tokens || 0), 0) || 0;
  const sessionCount = history?.count || 0;
  const avgCost = sessionCount > 0 ? totalCost / sessionCount : 0;

  // Budget data (mock - would come from API)
  const budget = {
    limit: 100,
    current: totalCost,
    period: 'MONTHLY' as const,
    warningThreshold: 80,
  };
  const usagePercentage = (budget.current / budget.limit) * 100;
  const remainingBudget = budget.limit - budget.current;

  // Cost over time data
  const costOverTime = history?.results
    .filter(s => s.cost && s.completed_at)
    .map(s => ({
      date: new Date(s.completed_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cost: s.cost!.estimated_cost,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30) || [];

  // Provider costs (mock - would come from API)
  const providerCosts = [
    { name: 'OpenAI', value: totalCost * 0.7 },
    { name: 'Anthropic', value: totalCost * 0.3 },
  ];

  // Recent costs
  const recentCosts = history?.results
    .filter(s => s.cost)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10) || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cost Analytics</h1>
          <p className="text-gray-600">Track your spending and manage budgets</p>
        </div>

        {/* Budget Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Current Period Budget</CardTitle>
            <CardDescription>
              Monthly budget: {formatCurrency(budget.limit)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Usage: {formatCurrency(budget.current)} / {formatCurrency(budget.limit)}
                </span>
                <Badge
                  variant={
                    usagePercentage >= 100
                      ? 'danger'
                      : usagePercentage >= budget.warningThreshold
                      ? 'warning'
                      : 'default'
                  }
                >
                  {usagePercentage.toFixed(1)}% used
                </Badge>
              </div>
              <Progress
                value={Math.min(usagePercentage, 100)}
                className={usagePercentage >= budget.warningThreshold ? 'h-3' : ''}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-500">Remaining</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(Math.max(0, remainingBudget))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-lg font-semibold">
                  {usagePercentage >= 100 ? (
                    <span className="text-red-600">Over Budget</span>
                  ) : usagePercentage >= budget.warningThreshold ? (
                    <span className="text-amber-600">Warning</span>
                  ) : (
                    <span className="text-green-600">Within Budget</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
              <p className="text-xs text-gray-500">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Cost</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(avgCost)}</div>
              <p className="text-xs text-gray-500">Per session</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Loader2 className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessionCount}</div>
              <p className="text-xs text-gray-500">Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <AlertTriangle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(totalTokens / 1000).toFixed(1)}K</div>
              <p className="text-xs text-gray-500">Tokens used</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Over Time</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : costOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={costOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#4f46e5"
                      name="Cost"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No cost data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost by Provider</CardTitle>
              <CardDescription>Breakdown by AI provider</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : providerCosts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={providerCosts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {providerCosts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No provider data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Costs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Costs</CardTitle>
            <CardDescription>Latest research session costs</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentCosts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Session</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Tokens</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCosts.map((session) => (
                      <tr key={session.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(session.created_at)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="max-w-md truncate">{session.query}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600">
                          {session.token_usage?.total_tokens.toLocaleString() || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold">
                          {session.cost ? formatCurrency(session.cost.estimated_cost) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No cost data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

