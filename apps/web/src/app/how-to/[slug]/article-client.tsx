'use client';

import { m } from 'framer-motion';
import { PaintCalculator } from '@/components/calculators/PaintCalculator';
import { TileCalculator } from '@/components/calculators/TileCalculator';

const PAINT_SLUG = 'oorooniinhudgiiherh-songoh';
const TILE_SLUG = 'shalniidevsgerrtavihzaawar';

function MarkdownProse({ content }: { content: string }) {
  const lines = content.trim().split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let inTable = false;
  const tableRows: string[][] = [];

  const flushTable = () => {
    if (!tableRows.length) return;
    const [header, , ...body] = tableRows;
    elements.push(
      <div key={key++} className="overflow-x-auto my-4">
        <table className="w-full text-sm rounded-xl overflow-hidden border border-[var(--glass-border)]">
          <thead>
            <tr className="bg-brand/10">
              {(header ?? []).map((cell, i) => (
                <th key={i} className="px-4 py-2.5 text-left font-semibold text-foreground border-b border-[var(--glass-border)]">
                  {cell.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-dark' : 'bg-card'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-foreground-muted">{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows.length = 0;
    inTable = false;
  };

  for (const raw of lines) {
    const line = raw;

    // Table
    if (line.startsWith('|')) {
      inTable = true;
      tableRows.push(line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1));
      continue;
    }
    if (inTable) flushTable();

    // H2
    if (line.startsWith('## ')) {
      elements.push(
        <m.h2
          key={key++}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-xl font-bold text-foreground mt-8 mb-3"
        >
          {line.slice(3)}
        </m.h2>
      );
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-base font-bold text-foreground mt-5 mb-2">
          {line.slice(4)}
        </h3>
      );
      continue;
    }

    // Bold list item
    if (line.startsWith('- **')) {
      const match = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)/);
      if (match) {
        elements.push(
          <div key={key++} className="flex gap-2 my-1.5">
            <span className="text-brand mt-1">•</span>
            <p className="text-foreground-muted text-sm">
              <span className="font-semibold text-foreground">{match[1]}</span>
              {match[2] ? `: ${match[2]}` : ''}
            </p>
          </div>
        );
        continue;
      }
    }

    // Regular list item
    if (line.startsWith('- ')) {
      elements.push(
        <div key={key++} className="flex gap-2 my-1">
          <span className="text-brand shrink-0 mt-0.5">•</span>
          <p className="text-foreground-muted text-sm">{line.slice(2)}</p>
        </div>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1] ?? '';
      elements.push(
        <div key={key++} className="flex gap-2 my-1.5">
          <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">
            {num}
          </span>
          <p className="text-foreground-muted text-sm">{line.replace(/^\d+\.\s/, '')}</p>
        </div>
      );
      continue;
    }

    // Block quote / tip
    if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <div key={key++} className="bg-brand/5 border-l-2 border-brand px-4 py-3 rounded-r-xl my-3">
          <p className="text-sm font-medium text-foreground">{line.slice(2, -2)}</p>
        </div>
      );
      continue;
    }

    // Inline bold lines
    if (line.includes('**')) {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      elements.push(
        <p key={key++} className="text-foreground-muted text-sm my-1.5 leading-relaxed">
          {parts.map((p, i) =>
            i % 2 === 1 ? <strong key={i} className="text-foreground font-semibold">{p}</strong> : p
          )}
        </p>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Paragraph
    elements.push(
      <p key={key++} className="text-foreground-muted text-sm my-1.5 leading-relaxed">
        {line}
      </p>
    );
  }

  if (inTable) flushTable();

  return <>{elements}</>;
}

function ShareButtons() {
  const SHARES = [
    { label: 'Facebook', icon: '📘', color: 'bg-blue-600/10 text-blue-400 border-blue-600/20' },
    { label: 'Twitter', icon: '🐦', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    { label: 'Холбоос хуулах', icon: '🔗', color: 'bg-card border-[var(--glass-border)] text-foreground-muted' },
  ];
  return (
    <div className="mt-10 pt-6 border-t border-[var(--glass-border)]">
      <p className="text-sm font-semibold text-foreground mb-3">Найзтайгаа хуваалцах:</p>
      <div className="flex gap-2 flex-wrap">
        {SHARES.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              if (s.label === 'Холбоос хуулах') navigator.clipboard?.writeText(window.location.href);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-opacity hover:opacity-80 ${s.color}`}
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ArticleClient({
  content,
  articleSlug,
}: {
  content: string;
  articleSlug: string;
}) {
  const showPaintCalc = articleSlug === PAINT_SLUG;
  const showTileCalc = articleSlug === TILE_SLUG;

  return (
    <div>
      <MarkdownProse content={content} />
      <ShareButtons />

      {(showPaintCalc || showTileCalc) && (
        <m.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-semibold text-brand uppercase tracking-wider">🧮 Тооцоолуур</span>
            <div className="flex-1 h-px bg-brand/20" />
          </div>
          {showPaintCalc && <PaintCalculator />}
          {showTileCalc && <TileCalculator />}
        </m.div>
      )}
    </div>
  );
}
