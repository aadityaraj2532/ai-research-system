import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface ResearchReportProps {
    content: any;
}

export default function ResearchReport({ content }: ResearchReportProps) {
    if (!content) return null;

    // If content is an object, try to find the markdown report
    if (typeof content === 'object') {
        const markdownContent = content.final_report || content.report || content.content;

        if (markdownContent && typeof markdownContent === 'string') {
            content = markdownContent;
        } else {
            return (
                <div className="prose prose-invert prose-lg max-w-none">
                    <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(content, null, 2)}
                    </pre>
                </div>
            );
        }
    }

    return (
        <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-6" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4 border-b border-border pb-2" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xl font-medium text-foreground mt-6 mb-3" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 space-y-2 my-4" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 space-y-2 my-4" {...props} />,
                    li: ({ node, ...props }) => <li className="text-muted-foreground/90 leading-relaxed" {...props} />,
                    p: ({ node, ...props }) => <p className="text-muted-foreground leading-relaxed my-4" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-6" {...props} />,
                    code: ({ node, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '')
                        return !match ? (
                            <code className={cn("bg-muted px-1.5 py-0.5 rounded text-sm text-foreground font-mono", className)} {...props}>
                                {children}
                            </code>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        )
                    },
                    a: ({ node, ...props }) => <a className="text-primary hover:underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
