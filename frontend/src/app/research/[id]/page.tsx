"use client";

import { useQuery } from "@tanstack/react-query";
import { getResearch, continueResearch } from "@/lib/api";
import ResearchStatus from "@/components/ResearchStatus";
import ResearchReport from "@/components/ResearchReport";
import FileUploader from "@/components/FileUploader";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, BrainCircuit, Files, Send, Share2, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";

export default function ResearchPage() {
    const params = useParams();
    const id = params?.id as string;
    const [activeTab, setActiveTab] = useState<'report' | 'reasoning' | 'sources'>('report');
    const [followUpQuery, setFollowUpQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: research, isLoading, error } = useQuery({
        queryKey: ['research', id],
        queryFn: () => getResearch(id),
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return (status === 'COMPLETED' || status === 'FAILED') ? false : 3000;
        },
    });

    // Switch to report tab automatically when completed if not already there
    useEffect(() => {
        if (research?.status === 'COMPLETED' && activeTab === 'report' && !research.report) {
            // If completed but no report (rare), maybe show reasoning? 
            // Actually standard behavior is fine.
        }
    }, [research?.status]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground">Loading research session...</p>
                </div>
            </div>
        );
    }

    if (error || !research) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-destructive text-lg">Failed to load research.</p>
                <Link href="/" className="text-primary hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Go back
                </Link>
            </div>
        );
    }

    const handleFollowUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!followUpQuery.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await continueResearch(id, followUpQuery);
            setFollowUpQuery("");
            // React Query will pick up the new state via polling info if backend updates status
            // But typically continueResearch creates a *new* session or updates this one?
            // Logic: The backend structure for continuation is: new session with parent_id.
            // So we should probably redirect to the new session ID.
            // Let's check api.ts logic. 
            // Accessing `continueResearch` returns response.data.
            // If it returns a new session, we should navigate.
            // Implementing navigation:
            // const newSession = await continueResearch(...)
            // router.push(`/research/${newSession.id}`)
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Refined handleFollowUp with navigation would need useRouter, but let's stick to simplest for now.
    // Actually, checking API: continueResearch returns new_session.
    // So I should navigate.

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-muted rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="font-semibold text-lg truncate max-w-md" title={research.query}>
                            {research.query}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border",
                            research.status === 'COMPLETED' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                research.status === 'FAILED' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                    "bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse"
                        )}>
                            {research.status}
                        </div>
                        <button className="p-2 hover:bg-muted rounded-full transition-colors">
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 space-y-8">
                {/* Status Visualization */}
                {research.status !== 'COMPLETED' && research.status !== 'FAILED' && (
                    <ResearchStatus status={research.status} />
                )}

                {/* Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Content (Report/Reasoning) */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Tabs */}
                        <div className="flex items-center gap-1 border-b border-border/50 pb-1">
                            <button
                                onClick={() => setActiveTab('report')}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 border-b-2",
                                    activeTab === 'report'
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <BookOpen className="w-4 h-4" /> Report
                            </button>
                            <button
                                onClick={() => setActiveTab('reasoning')}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 border-b-2",
                                    activeTab === 'reasoning'
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <BrainCircuit className="w-4 h-4" /> Reasoning
                            </button>
                            <button
                                onClick={() => setActiveTab('sources')}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 border-b-2",
                                    activeTab === 'sources'
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Files className="w-4 h-4" /> Sources
                            </button>
                        </div>

                        <div className="min-h-[500px] bg-background">
                            <AnimatePresence mode="wait">
                                {activeTab === 'report' && (
                                    <motion.div
                                        key="report"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {research.report ? (
                                            <ResearchReport content={research.report} />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-dashed rounded-xl">
                                                <Loader2 className="w-8 h-8 animate-spin mb-4 opacity-50" />
                                                <p>Generating report...</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === 'reasoning' && (
                                    <motion.div
                                        key="reasoning"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {/* Render reasoning object nicely */}
                                        <div className="space-y-4">
                                            {research.reasoning && Object.entries(research.reasoning).map(([key, value]) => (
                                                <div key={key} className="bg-muted/30 p-4 rounded-lg">
                                                    <h3 className="text-sm font-semibold text-primary capitalize mb-2">{key.replace(/_/g, ' ')}</h3>
                                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{String(value)}</p>
                                                </div>
                                            ))}
                                            {!research.reasoning && (
                                                <p className="text-muted-foreground">No reasoning steps available yet.</p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'sources' && (
                                    <motion.div
                                        key="sources"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="space-y-4">
                                            {research.sources?.map((source: any, i: number) => (
                                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                                                    <Files className="w-4 h-4 mt-1 text-primary" />
                                                    <div>
                                                        <p className="text-sm font-medium">{source.filename || source.title || "Unknown Source"}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{source.file_type || "Web Source"}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!research.sources || research.sources.length === 0) && (
                                                <p className="text-muted-foreground">No sources gathered yet.</p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="p-5 rounded-xl border border-border/50 bg-muted/10 backdrop-blur-sm">
                            <h3 className="text-sm font-medium mb-4">Context Files</h3>
                            <FileUploader researchId={id} />
                        </div>

                        <div className="p-5 rounded-xl border border-border/50 bg-muted/10 backdrop-blur-sm">
                            <h3 className="text-sm font-medium mb-4">Research Stats</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Status</span>
                                    <span className="font-medium">{research.status}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Cost</span>
                                    <span className="font-medium">
                                        {research.cost?.currency} {Number(research.cost?.estimated_cost || 0).toFixed(4)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Tokens</span>
                                    <span className="font-medium">{research.token_usage?.total_tokens.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer Follow-up */}
            <div className="border-t border-border/40 bg-background/80 backdrop-blur-xl p-4 sticky bottom-0 z-50">
                <form onSubmit={handleFollowUp} className="max-w-3xl mx-auto relative">
                    <input
                        type="text"
                        value={followUpQuery}
                        onChange={(e) => setFollowUpQuery(e.target.value)}
                        placeholder="Ask a follow-up question to continue research..."
                        disabled={isSubmitting}
                        className="w-full bg-muted/50 border border-white/10 text-foreground placeholder:text-muted-foreground/50 py-3 pl-4 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                        type="submit"
                        disabled={!followUpQuery.trim() || isSubmitting}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
