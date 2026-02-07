"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { startResearch } from "@/lib/api";

export default function ResearchInput() {
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading) return;

        setIsLoading(true);
        try {
            const session = await startResearch(query);
            router.push(`/research/${session.id}`);
        } catch (error) {
            console.error("Failed to start research:", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto relative z-10">
            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                onSubmit={handleSubmit}
                className="relative group"
            >
                <div className="relative flex items-center">
                    <div className="absolute left-4 text-muted-foreground group-focus-within:text-primary transition-colors">
                        <Search className="w-5 h-5" />
                    </div>

                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="What do you want to research deeply?"
                        className={cn(
                            "w-full bg-background/50 backdrop-blur-xl border border-white/10",
                            "text-lg text-foreground placeholder:text-muted-foreground/50",
                            "py-4 pl-12 pr-14 rounded-2xl shadow-xl",
                            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
                            "transition-all duration-300 ease-out",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={isLoading}
                    />

                    <div className="absolute right-3">
                        <button
                            type="submit"
                            disabled={!query.trim() || isLoading}
                            className={cn(
                                "p-2 rounded-xl bg-primary text-primary-foreground",
                                "hover:bg-primary/90 hover:scale-105 active:scale-95",
                                "disabled:opacity-0 disabled:scale-75 disabled:pointer-events-none",
                                "transition-all duration-200 ease-out shadow-lg shadow-primary/20",
                                "flex items-center justify-center"
                            )}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            ) : (
                                <ArrowRight className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 -z-10" />
            </motion.form>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground/60"
            >
                <Sparkles className="w-3 h-3" />
                <span>Powered by Groq & LangChain</span>
            </motion.div>
        </div>
    );
}
