'use client';

import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-slate max-w-none', className)}>
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            return !inline ? (
              <code className={cn('block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto', className)} {...props}>
                {children}
              </code>
            ) : (
              <code className={cn('bg-gray-100 px-1.5 py-0.5 rounded text-sm', className)} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

