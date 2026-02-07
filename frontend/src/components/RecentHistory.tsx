"use client";

import { useQuery } from "@tanstack/react-query";
import { getHistory } from "@/lib/api";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function RecentHistory() {
    const { data, isLoading } = useQuery({
        queryKey: ['history'],
        queryFn: getHistory,
    });

    if (isLoading) return null;

    const history = data?.results?.slice(0, 3) || [];

    if (history.length === 0) return null;

    return (
        <div className="mt-12 w-full max-w-2xl mx-auto">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Research
            </h3>
            <div className="grid gap-3">
                {history.map((session: any) => (
                    <Link
                        key={session.id}
                        href={`/research/${session.id}`}
                        className="group flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-200"
                    >
                        <p className="font-medium text-foreground text-center group-hover:text-primary transition-colors">
                            {session.query}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                            {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })} • {session.status.toLowerCase()}
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
