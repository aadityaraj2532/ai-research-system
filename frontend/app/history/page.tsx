'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, FileText, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/research/status-badge';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function HistoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: history, isLoading } = useQuery({
    queryKey: ['research-history'],
    queryFn: () => api.getResearchHistory(1, 100),
  });

  const filteredSessions = history?.results.filter((session) => {
    const matchesSearch = searchQuery === '' || 
      session.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Research History</h1>
          <p className="text-gray-600">Browse and search all your research sessions</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by query or summary..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {isLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <Skeleton className="h-3 w-1/4" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : filteredSessions.length > 0 ? (
            filteredSessions.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/research/${session.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={session.status} />
                        {session.is_continuation && (
                          <Badge variant="outline">Continuation</Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {session.query}
                      </h3>
                      {session.summary && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {session.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                        {session.cost && (
                          <span className="font-medium">{formatCurrency(session.cost.estimated_cost)}</span>
                        )}
                        {session.duration && <span>{session.duration}</span>}
                        <span>{formatDate(session.created_at)}</span>
                        {session.files && session.files.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {session.files.length} file(s)
                          </Badge>
                        )}
                        {session.token_usage && (
                          <span>{(session.token_usage.total_tokens / 1000).toFixed(1)}K tokens</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No research sessions match your filters.'
                    : 'No research sessions yet. Start your first research from the home page!'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pagination could go here */}
        {filteredSessions.length > 0 && (
          <div className="text-center text-sm text-gray-500">
            Showing {filteredSessions.length} of {history?.count || 0} sessions
          </div>
        )}
      </div>
    </MainLayout>
  );
}

