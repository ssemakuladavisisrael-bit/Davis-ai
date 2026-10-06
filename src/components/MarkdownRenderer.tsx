import React, { useMemo } from 'react';
import { marked, Tokens } from 'marked';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const tokens = useMemo(() => {
    try {
      return marked.lexer(content);
    } catch (e) {
      console.error('Error parsing markdown:', e);
      return [];
    }
  }, [content]);

  if (!tokens || tokens.length === 0) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  const renderInline = (rawText: string) => {
    try {
      const parsed = marked.parseInline(rawText);
      return typeof parsed === 'string' ? parsed : rawText;
    } catch {
      return rawText;
    }
  };

  return (
    <div className="markdown-content text-slate-800 text-[14.5px] leading-relaxed space-y-3 font-normal">
      {tokens.map((token, index) => {
        switch (token.type) {
          case 'code':
            return (
              <CodeBlock
                key={index}
                code={token.text}
                language={(token as Tokens.Code).lang}
              />
            );

          case 'heading': {
            const headingToken = token as Tokens.Heading;
            const Tag = `h${headingToken.depth}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
            const sizeClasses = {
              1: 'text-2xl font-bold text-slate-900 mt-5 mb-2 pb-1 border-b border-slate-200',
              2: 'text-xl font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-100',
              3: 'text-lg font-semibold text-slate-900 mt-3 mb-1.5',
              4: 'text-base font-semibold text-slate-800 mt-2 mb-1',
              5: 'text-sm font-semibold text-slate-800 mt-2 mb-1',
              6: 'text-xs font-semibold uppercase tracking-wider text-slate-600 mt-2 mb-1',
            }[headingToken.depth] || 'text-base font-semibold text-slate-900';

            return (
              <Tag
                key={index}
                className={sizeClasses}
                dangerouslySetInnerHTML={{ __html: renderInline(headingToken.text) }}
              />
            );
          }

          case 'paragraph': {
            const pToken = token as Tokens.Paragraph;
            return (
              <p
                key={index}
                className="leading-relaxed text-slate-700 font-normal"
                dangerouslySetInnerHTML={{ __html: renderInline(pToken.text) }}
              />
            );
          }

          case 'list': {
            const listToken = token as Tokens.List;
            const ListTag = listToken.ordered ? 'ol' : 'ul';
            const listStyle = listToken.ordered
              ? 'list-decimal pl-5 space-y-1 my-2 text-slate-700'
              : 'list-disc pl-5 space-y-1 my-2 text-slate-700';

            return (
              <ListTag key={index} className={listStyle}>
                {listToken.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    className="leading-relaxed pl-1"
                    dangerouslySetInnerHTML={{ __html: renderInline(item.text) }}
                  />
                ))}
              </ListTag>
            );
          }

          case 'blockquote': {
            const bqToken = token as Tokens.Blockquote;
            return (
              <blockquote
                key={index}
                className="border-l-3.5 border-indigo-500 pl-4 py-1.5 my-3 bg-indigo-50/50 rounded-r text-slate-700 italic"
                dangerouslySetInnerHTML={{ __html: renderInline(bqToken.text) }}
              />
            );
          }

          case 'table': {
            const tblToken = token as Tokens.Table;
            return (
              <div key={index} className="overflow-x-auto my-3 rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-700 font-semibold">
                    <tr>
                      {tblToken.header.map((cell, cIdx) => (
                        <th
                          key={cIdx}
                          className="px-3.5 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-700"
                          dangerouslySetInnerHTML={{ __html: renderInline(cell.text) }}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {tblToken.rows.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-3.5 py-2 text-slate-700"
                            dangerouslySetInnerHTML={{ __html: renderInline(cell.text) }}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          case 'hr':
            return <hr key={index} className="my-4 border-slate-200" />;

          case 'space':
            return null;

          default:
            if ('text' in token && typeof token.text === 'string') {
              return (
                <p
                  key={index}
                  className="leading-relaxed text-slate-700"
                  dangerouslySetInnerHTML={{ __html: renderInline(token.text) }}
                />
              );
            }
            return null;
        }
      })}
    </div>
  );
};
