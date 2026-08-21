"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 챗봇 답변용 마크다운 렌더러. 굵게·기울임·취소선·목록만 스타일을 입힌다. */
export default function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (props) => <p className="mb-2 whitespace-pre-wrap last:mb-0" {...props} />,
          strong: (props) => <strong className="font-bold" {...props} />,
          em: (props) => <em className="italic" {...props} />,
          del: (props) => <del className="line-through opacity-80" {...props} />,
          ul: (props) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0" {...props} />,
          ol: (props) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0" {...props} />,
          li: (props) => <li {...props} />,
          a: (props) => (
            <a
              className="underline decoration-dotted underline-offset-2"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          code: (props) => (
            <code className="rounded bg-black/10 px-1 py-0.5 text-[0.85em] dark:bg-white/10" {...props} />
          ),
          blockquote: (props) => (
            <blockquote className="border-l-2 border-current/30 pl-2 opacity-90" {...props} />
          ),
          h1: (props) => <p className="mb-1 font-bold" {...props} />,
          h2: (props) => <p className="mb-1 font-bold" {...props} />,
          h3: (props) => <p className="mb-1 font-semibold" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
