import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * children 또는 text prop 둘 다 허용.
 */
export default function MarkdownView({ children, text, className = '' }) {
  const md = text ?? children ?? '';
  return (
    <div className={`md-view ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
    </div>
  );
}
