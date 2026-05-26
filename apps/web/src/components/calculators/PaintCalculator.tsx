'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

interface Result {
  liters: number;
  cans: number;
  coats: number;
}

export function PaintCalculator() {
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [height, setHeight] = useState('3');
  const [doors, setDoors] = useState('1');
  const [windows, setWindows] = useState('2');
  const [result, setResult] = useState<Result | null>(null);

  const COVERAGE = 10; // m² per liter per coat
  const COATS = 2;
  const CAN_SIZE = 3; // liters

  const calculate = () => {
    const w = parseFloat(width);
    const l = parseFloat(length);
    const h = parseFloat(height) || 3;
    const d = parseInt(doors) || 0;
    const win = parseInt(windows) || 0;

    if (!w || !l || w <= 0 || l <= 0) return;

    const wallArea = 2 * (w + l) * h;
    const doorArea = d * 2.0;   // 1m × 2m per door
    const windowArea = win * 1.5; // 1m × 1.5m per window
    const netArea = Math.max(0, wallArea - doorArea - windowArea);

    const liters = (netArea / COVERAGE) * COATS;
    const cans = Math.ceil(liters / CAN_SIZE);

    setResult({ liters: Math.ceil(liters), cans, coats: COATS });
  };

  const inputCls =
    'w-full rounded-xl border border-[var(--glass-border)] bg-dark px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-brand';

  return (
    <div className="bg-card rounded-2xl border border-[var(--glass-border)] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--glass-border)] bg-gradient-to-r from-brand/5 to-transparent">
        <span className="text-2xl">🎨</span>
        <div>
          <h3 className="font-bold text-foreground text-sm">Будгийн тооцоолуур</h3>
          <p className="text-xs text-foreground-muted">Өрөөний хэмжээ оруулан будаг тооцоол</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-foreground-muted mb-1">Өрөөний урт (м)</label>
            <input
              type="number"
              value={length}
              onChange={(e) => { setLength(e.target.value); setResult(null); }}
              placeholder="5.5"
              min="1"
              step="0.1"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-foreground-muted mb-1">Өрөөний өргөн (м)</label>
            <input
              type="number"
              value={width}
              onChange={(e) => { setWidth(e.target.value); setResult(null); }}
              placeholder="4.0"
              min="1"
              step="0.1"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-foreground-muted mb-1">Өндөр (м)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => { setHeight(e.target.value); setResult(null); }}
              placeholder="3.0"
              min="2"
              step="0.1"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-foreground-muted mb-1">Хаалга</label>
            <input
              type="number"
              value={doors}
              onChange={(e) => { setDoors(e.target.value); setResult(null); }}
              min="0"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-foreground-muted mb-1">Цонх</label>
            <input
              type="number"
              value={windows}
              onChange={(e) => { setWindows(e.target.value); setResult(null); }}
              min="0"
              className={inputCls}
            />
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
        >
          Тооцоолох
        </button>

        <AnimatePresence>
          {result && (
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl bg-brand/5 border border-brand/20 p-4"
            >
              <p className="text-xs text-foreground-muted mb-3">Тооцооллын үр дүн ({result.coats} давхар будагт):</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-brand">{result.liters}л</p>
                  <p className="text-xs text-foreground-muted mt-0.5">Нийт будаг</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{result.cans}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">3л савлагаа</p>
                </div>
              </div>
              <p className="text-xs text-foreground-muted text-center mt-3">
                💡 10% нэмж авахыг зөвлөж байна
              </p>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
