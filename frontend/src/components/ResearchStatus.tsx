"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResearchStatusProps {
    status: string;
    className?: string;
}

const steps = [
    { id: 'PENDING', label: 'Initializing Research' },
    { id: 'PROCESSING', label: 'Analyzing & Gathering Data' },
    { id: 'COMPLETED', label: 'Finalizing Report' },
];

export default function ResearchStatus({ status, className }: ResearchStatusProps) {
    // Determine current step index
    let currentStepIndex = 0;
    if (status === 'PROCESSING') currentStepIndex = 1;
    if (status === 'COMPLETED') currentStepIndex = 3; // All done

    return (
        <div className={cn("w-full max-w-xl mx-auto space-y-8", className)}>
            <div className="relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted" />
                <motion.div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(currentStepIndex / 2) * 100}%` }}
                    transition={{ duration: 0.5 }}
                />

                <div className="relative flex justify-between">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex || (index === 1 && status === 'PROCESSING'); // Keep processing active

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                                        isCompleted ? "border-primary bg-primary text-primary-foreground" :
                                            isCurrent ? "border-primary bg-background text-primary" :
                                                "border-muted bg-background text-muted-foreground"
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5" />
                                    ) : isCurrent ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Circle className="w-4 h-4" />
                                    )}
                                </div>
                                <span className={cn(
                                    "text-xs font-medium transition-colors duration-300",
                                    isCurrent || isCompleted ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {status === 'PROCESSING' && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-sm text-muted-foreground animate-pulse"
                >
                    AI agents are browsing the web and analyzing sources...
                </motion.p>
            )}
        </div>
    );
}
