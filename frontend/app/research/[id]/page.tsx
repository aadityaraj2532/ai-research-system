'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, ExternalLink, Copy, Download } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/research/status-badge';
import { MarkdownRenderer } from '@/components/research/markdown-renderer';
import { FileUpload } from '@/components/research/file-upload';
import { api } from '@/lib/api';
import { formatDate, formatCurrency, formatDuration, getStatusIcon } from '@/lib/utils';
import type { ResearchSession } from '@/types';

export default function ResearchSessionPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const researchId = params.id as string;
  const [continueQuery, setContinueQuery] = useState('');

  const { data: session, isLoading, error } = useQuery({
    queryKey: ['research', researchId],
    queryFn: () => api.getResearchDetails(researchId),
    refetchInterval: (query) => {
      // Poll every 3 seconds if status is PROCESSING or PENDING
      const status = query.state?.data?.status;
      return status === 'PROCESSING' || status === 'PENDING' ? 3000 : false;
    },
  });

  const continueResearchMutation = useMutation({
    mutationFn: (query: string) => api.continueResearch(researchId, { query }),
    onSuccess: (data: ResearchSession) => {
      queryClient.invalidateQueries({ queryKey: ['research-history'] });
      router.push(`/research/${data.id}`);
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: (file: File) => api.uploadFile(researchId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research', researchId] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => api.deleteFile(researchId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research', researchId] });
    },
  });

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!continueQuery.trim()) return;
    continueResearchMutation.mutate(continueQuery);
    setContinueQuery('');
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (error || !session) {
    return (
      <MainLayout>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-red-600">Failed to load research session</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const isProcessing = session.status === 'PROCESSING' || session.status === 'PENDING';
  const reportContent = typeof session.report === 'string' 
    ? session.report 
    : session.report?.final_report || '';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.query}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={session.status} />
              {session.cost && (
                <Badge variant="outline">{formatCurrency(session.cost.estimated_cost)}</Badge>
              )}
              {session.duration && (
                <Badge variant="outline">{session.duration}</Badge>
              )}
              {session.trace_url && (
                <a
                  href={session.trace_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  View Trace <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Research in Progress...</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Analyzing query and gathering sources...
                  </p>
                </div>
              </div>
              <Progress value={50} className="mt-4" />
            </CardContent>
          </Card>
        )}

        {/* Failed Content */}
        {session.status === 'FAILED' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Research Failed</CardTitle>
            </CardHeader>
            <CardContent>
              {session.reasoning?.clarification_question ? (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-900 mb-2">Clarification Needed</h3>
                    <p className="text-yellow-800">{session.reasoning.clarification_question}</p>
                  </div>
                  <p className="text-gray-600">
                    {session.reasoning.note || 'Please provide more details in your query and try again.'}
                  </p>
                  <Button onClick={() => router.push('/')}>
                    Start New Research
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-red-600">
                    {session.reasoning?.error || 'An error occurred during research execution.'}
                  </p>
                  <Button onClick={() => router.push('/')}>
                    Back to Home
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Completed Content */}
        {session.status === 'COMPLETED' && (
          <>
            <Tabs defaultValue="report" className="w-full">
              <TabsList>
                <TabsTrigger value="report">Report</TabsTrigger>
                <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
                <TabsTrigger value="files">Files ({session.files?.length || 0})</TabsTrigger>
                <TabsTrigger value="cost">Cost Details</TabsTrigger>
              </TabsList>

              <TabsContent value="report" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Research Report</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export PDF
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {reportContent ? (
                      <div className="prose max-w-none">
                        <MarkdownRenderer content={reportContent} />
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">No report available</p>
                        <p className="text-sm text-gray-400">
                          The research may have been interrupted or failed to generate a report.
                          {session.reasoning?.clarification_question && 
                            ' The agent may have needed clarification.'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reasoning" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Reasoning & Methodology</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {session.reasoning ? (
                      <>
                        {session.reasoning.research_brief && (
                          <div>
                            <h3 className="font-semibold mb-2">Research Brief</h3>
                            <p className="text-gray-700">{session.reasoning.research_brief}</p>
                          </div>
                        )}
                        {session.reasoning.methodology && (
                          <div>
                            <h3 className="font-semibold mb-2">Methodology</h3>
                            <p className="text-gray-700">{session.reasoning.methodology}</p>
                          </div>
                        )}
                        {session.reasoning.key_findings && session.reasoning.key_findings.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-2">Key Findings</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                              {session.reasoning.key_findings.map((finding, i) => (
                                <li key={i}>{finding}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500">No reasoning information available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="files" className="space-y-4">
                <FileUpload
                  researchId={researchId}
                  onUpload={async (file) => {
                    await uploadFileMutation.mutateAsync(file);
                  }}
                  files={session.files}
                  onDelete={async (fileId) => {
                    await deleteFileMutation.mutateAsync(fileId);
                  }}
                />
              </TabsContent>

              <TabsContent value="cost" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {session.cost ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Estimated Cost</p>
                            <p className="text-2xl font-bold">{formatCurrency(session.cost.estimated_cost)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Currency</p>
                            <p className="text-2xl font-bold">{session.cost.currency}</p>
                          </div>
                        </div>
                        {session.token_usage && (
                          <div className="pt-4 border-t">
                            <h3 className="font-semibold mb-3">Token Usage</h3>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-gray-500">Input Tokens</p>
                                <p className="text-lg font-semibold">{session.token_usage.input_tokens.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Output Tokens</p>
                                <p className="text-lg font-semibold">{session.token_usage.output_tokens.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Total Tokens</p>
                                <p className="text-lg font-semibold">{session.token_usage.total_tokens.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500">No cost information available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Continue Research Section */}
        {session.status === 'COMPLETED' && (
          <Card>
            <CardHeader>
              <CardTitle>Continue Research</CardTitle>
              <CardDescription>
                Ask a follow-up question to extend this research
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContinue} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="What would you like to explore further?"
                  value={continueQuery}
                  onChange={(e) => setContinueQuery(e.target.value)}
                  className="flex-1"
                  disabled={continueResearchMutation.isPending}
                />
                <Button
                  type="submit"
                  disabled={!continueQuery.trim() || continueResearchMutation.isPending}
                >
                  {continueResearchMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* File Upload (for active sessions) */}
        {isProcessing && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Context Files</CardTitle>
              <CardDescription>
                Add files to provide additional context for your research
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                researchId={researchId}
                onUpload={async (file) => {
                  await uploadFileMutation.mutateAsync(file);
                }}
                files={session.files}
                onDelete={async (fileId) => {
                  await deleteFileMutation.mutateAsync(fileId);
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

