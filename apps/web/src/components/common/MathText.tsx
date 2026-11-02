import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  content?: string | null;
  className?: string;
  displayMode?: boolean;
}

/**
 * Renders mixed text containing inline ($...$ or \(...\)) and block ($$...$$ or \[...\]) LaTeX formulas.
 */
export const MathText: React.FC<MathTextProps> = React.memo(({ content, className = '', displayMode = false }) => {
  const parts = useMemo(() => {
    if (!content) return [];

    // Fast-path: if text contains no math delimiters, return plain text immediately without regex overhead
    if (!content.includes('$') && !content.includes('\\')) {
      return [{ text: content, isMath: false, isBlock: false }];
    }

    // Match block math ($$...$$ or \[...\]) and inline math ($...$ or \(...\))
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?:\\.|[^$\\])+\$|\\\([\s\S]*?\\\))/g;

    const tokens: { text: string; isMath: boolean; isBlock: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          text: content.substring(lastIndex, match.index),
          isMath: false,
          isBlock: false,
        });
      }

      const raw = match[0];
      if (raw.startsWith('$$') && raw.endsWith('$$')) {
        tokens.push({
          text: raw.slice(2, -2).trim(),
          isMath: true,
          isBlock: true,
        });
      } else if (raw.startsWith('\\[') && raw.endsWith('\\]')) {
        tokens.push({
          text: raw.slice(2, -2).trim(),
          isMath: true,
          isBlock: true,
        });
      } else if (raw.startsWith('$') && raw.endsWith('$')) {
        tokens.push({
          text: raw.slice(1, -1).trim(),
          isMath: true,
          isBlock: false,
        });
      } else if (raw.startsWith('\\(') && raw.endsWith('\\)')) {
        tokens.push({
          text: raw.slice(2, -2).trim(),
          isMath: true,
          isBlock: false,
        });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      tokens.push({
        text: content.substring(lastIndex),
        isMath: false,
        isBlock: false,
      });
    }

    return tokens;
  }, [content]);

  if (!content) return null;

  return (
    <span className={`tku-math-text ${className}`}>
      {parts.map((part, index) => {
        if (!part.isMath) {
          return <span key={index}>{part.text}</span>;
        }

        try {
          const html = katex.renderToString(part.text, {
            displayMode: part.isBlock || displayMode,
            throwOnError: false,
            strict: false,
          });
          return (
            <span
              key={index}
              className={part.isBlock ? 'tku-katex-block' : 'tku-katex-inline'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <span key={index} className="tku-katex-fallback">
              {part.text}
            </span>
          );
        }
      })}
    </span>
  );
});

MathText.displayName = 'MathText';

