import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../utils/api';
import { cn } from '../utils/cn';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const isDark = document.documentElement.classList.contains('dark');

  function copy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group my-2">
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-background/80 text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language || 'text'}
        PreTag="div"
        className="!rounded-lg !text-sm"
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';

  // Try to parse content if it's JSON (image messages)
  let displayContent = message.content;
  let imageData: Array<{ type: string; source?: { type: string; media_type: string; data: string } }> = [];

  try {
    const parsed = JSON.parse(message.content);
    if (Array.isArray(parsed)) {
      imageData = parsed.filter((p: { type: string }) => p.type === 'image');
      const textPart = parsed.find((p: { type: string; text?: string }) => p.type === 'text');
      displayContent = textPart?.text || '';
    }
  } catch { /* not JSON */ }

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 mt-1">
          T
        </div>
      )}
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
        isUser
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-card border border-border text-foreground rounded-bl-sm'
      )}>
        {imageData.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {imageData.map((img, i) => (
              img.source && (
                <img
                  key={i}
                  src={`data:${img.source.media_type};base64,${img.source.data}`}
                  alt="attached"
                  className="max-w-48 max-h-48 rounded-lg object-cover"
                />
              )
            ))}
          </div>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{displayContent}</p>
        ) : (
          <div className={cn('prose prose-sm dark:prose-invert max-w-none', isStreaming && 'streaming-cursor')}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isBlock = !props.style;
                  return match && isBlock ? (
                    <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>
                  ) : (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        )}
        <p className={cn('text-xs mt-1.5', isUser ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-xs font-bold shrink-0 mt-1">
          J
        </div>
      )}
    </div>
  );
}
