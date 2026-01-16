'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, FileText, TrendingUp, DollarSign, Clock, Loader2, Sparkles, ArrowRight, Zap, Upload, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/research/status-badge';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { ResearchSession } from '@/types';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['research-history'],
    queryFn: () => api.getResearchHistory(1, 10),
    enabled: mounted,
  });

  const startResearchMutation = useMutation({
    mutationFn: async (query: string) => {
      const session = await api.startResearch({ query });
      
      // Upload files if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            await api.uploadFile(session.id, file);
          } catch (error) {
            console.error('Error uploading file:', error);
          }
        }
      }
      
      return session;
    },
    onSuccess: (data: ResearchSession) => {
      router.push(`/research/${data.id}`);
    },
  });

  const handleStartResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    startResearchMutation.mutate(query);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const totalSessions = history?.count || 0;
  const totalCost = history?.results?.reduce((sum, s) => sum + (s.cost?.estimated_cost || 0), 0) || 0;
  const avgCost = totalSessions > 0 ? totalCost / totalSessions : 0;
  const totalTokens = history?.results?.reduce((sum, s) => sum + (s.token_usage?.total_tokens || 0), 0) || 0;

  if (!mounted) {
    return (
      <MainLayout>
        <div className="space-y-12">
          <div className="text-center space-y-6 py-12">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-8 w-96 mx-auto" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div 
        className="space-y-12"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Hero Section with Gradient */}
        <motion.div variants={item} className="text-center space-y-6 py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">AI-Powered Deep Research</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold">
            <span className="gradient-text">Discover Insights</span>
            <br />
            <span className="text-gray-900">With AI Research</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Ask any question and let our AI conduct comprehensive research, 
            analyze sources, and deliver actionable insights in minutes.
          </p>
        </motion.div>

        {/* Enhanced Search Form */}
        <motion.div variants={item}>
          <Card className="max-w-4xl mx-auto glass border-2 border-white/50 shadow-2xl hover:shadow-indigo-100/50 transition-all duration-300">
            <CardContent className="pt-8 pb-8">
              <form onSubmit={handleStartResearch} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    <Input
                      type="text"
                      placeholder="What would you like to research today?"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-12 h-14 text-base border-2 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                      disabled={startResearchMutation.isPending}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!query.trim() || startResearchMutation.isPending}
                    className="h-14 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    {startResearchMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Starting Research...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                        Start Research
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>

                {/* File Upload Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1">
                      <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer group">
                        <Upload className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                        <span className="text-sm text-gray-600 group-hover:text-indigo-700 transition-colors">
                          Upload context files (optional)
                        </span>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          accept=".txt,.pdf,.doc,.docx,.md"
                          disabled={startResearchMutation.isPending}
                        />
                      </div>
                    </label>
                  </div>

                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-sm"
                        >
                          <FileText className="h-4 w-4 text-indigo-600" />
                          <span className="text-indigo-700">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3 text-indigo-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Quick Examples */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="text-sm text-gray-500">Try:</span>
                  {[
                    "Latest AI developments",
                    "Climate change solutions",
                    "Quantum computing applications"
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setQuery(example)}
                      className="text-sm px-3 py-1 rounded-full bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Quick Stats */}
        <motion.div 
          variants={item}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="relative overflow-hidden border-2 hover:border-indigo-200 transition-all duration-300 hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-transparent rounded-full -mr-16 -mt-16 opacity-50" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Research</CardTitle>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{totalSessions}</div>
                <p className="text-xs text-gray-500 mt-1">All time sessions</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="relative overflow-hidden border-2 hover:border-green-200 transition-all duration-300 hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-transparent rounded-full -mr-16 -mt-16 opacity-50" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Cost</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalCost)}</div>
                <p className="text-xs text-gray-500 mt-1">All time spending</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="relative overflow-hidden border-2 hover:border-purple-200 transition-all duration-300 hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-transparent rounded-full -mr-16 -mt-16 opacity-50" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Avg Cost</CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{formatCurrency(avgCost)}</div>
                <p className="text-xs text-gray-500 mt-1">Per session</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="relative overflow-hidden border-2 hover:border-amber-200 transition-all duration-300 hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100 to-transparent rounded-full -mr-16 -mt-16 opacity-50" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Tokens</CardTitle>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{(totalTokens / 1000).toFixed(1)}K</div>
                <p className="text-xs text-gray-500 mt-1">Tokens used</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Recent Research Sessions with Enhanced Design */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Recent Research</h2>
            {history?.results && history.results.length > 0 && (
              <Button 
                variant="ghost" 
                onClick={() => router.push('/history')}
                className="group"
              >
                View All
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
          
          {historyLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : history?.results && history.results.length > 0 ? (
            <div className="space-y-4">
              {history.results.slice(0, 10).map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-indigo-200 group relative overflow-hidden"
                    onClick={() => router.push(`/research/${session.id}`)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 via-indigo-50/50 to-indigo-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CardContent className="pt-6 relative z-10">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                              <FileText className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                                {session.query}
                              </h3>
                              {session.summary && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                                  {session.summary}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <StatusBadge status={session.status} />
                            {session.cost && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {formatCurrency(session.cost.estimated_cost)}
                              </Badge>
                            )}
                            {session.duration && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Clock className="h-3 w-3 mr-1" />
                                {session.duration}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatDate(session.created_at)}
                            </span>
                            {session.files && session.files.length > 0 && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {session.files.length} file(s)
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
              <CardContent className="pt-12 pb-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
                  <FileText className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No research sessions yet</h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  Start your first research above to unlock the power of AI-driven insights!
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => document.querySelector('input')?.focus()}
                  className="group"
                >
                  <Sparkles className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                  Get Started
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </motion.div>
    </MainLayout>
  );
}
