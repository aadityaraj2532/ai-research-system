import ResearchInput from "@/components/ResearchInput";
import RecentHistory from "@/components/RecentHistory";
import { Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center text-center space-y-8">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-medium text-muted-foreground mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Sparkles className="w-3 h-3 mr-2" />
          <span>New: Deep Research v2</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          Supercharge your research
          <br />
          with AI intelligence
        </h1>

        <p className="max-w-xl text-lg text-muted-foreground animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          Get comprehensive reports, deep insights, and verified sources in minutes, not hours.
        </p>

        <div className="w-full pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <ResearchInput />
        </div>

        <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          <RecentHistory />
        </div>
      </div>
    </main>
  );
}
