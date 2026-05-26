'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

interface Result {
  tiles: number;
  withWaste: number;
  sqm: number;
  boxes: number;
}

const TILE_PRESETS = [
  { label: '30×30', w: 0.3, h: 0.3 },
  { label: '40×40', w: 0.4, h: 0.4 },
  { label: '60×60', w: 0.6, h: 0.6 },
  { label: '30×60', w: 0.3, h: 0.6 },
  { label: '60×120', w: 0.6, h: 1.2 },
];

export function TileCalculator() {
  const [roomW, setRoomW] = useState('');
  const [roomL, setRoomL] = useState('');
  const [preset, setPreset] = useState(TILE_PRESETS[1]);
  const [tileW, setTileW] = useState('');
  const [tileL, setTileL] = useState('');
  const [waste, setWaste] = useState('10');
  const [result, setResult] = useState<Result | null>(null);
  const [usePreset, setUsePreset] = useState(true);

  const TILES_PER_BOX = 10;

  const calculate = () => {
    const rw = parseFloat(roomW);
    const rl = parseFloat(roomL);
    if (!rw || !rl || rw <= 0 || rl <= 0) return;

    const tw = usePreset ? preset.w : (parseFloat(tileW) / 100 || 0.4);
    const tl = usePreset ? preset.h : (parseFloat(tileL) / 100 || 0.4);
    if (tw <= 0 || tl <= 0) return;

    const sqm = rw * rl;
    const tileArea = tw * tl;
    const exactTiles = sqm / tileArea;
    const wastePct = (parseFloat(waste) || 10) / 100;
    const withWasteTiles = Math.ceil(exactTiles * (1 + wastePct));
    const boxes = Math.ceil(withWasteTiles / TILES_PER_BOX);

    setResult({ tiles: Math.ceil(exactTiles), withWaste: withWasteTiles, sqm, boxes });
  };

  const inputCls =
    'w-full rounded-xl border border-[var(--glass-border)] bg-dark px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-brand';

  return (
    <div className="bg-card rounded-2xl border border-[var(--glass-border)] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--glass-border)] bg-gradient-to-r from-amber/5 to-transparent">
        <span className="text-2xl">🔲</span>
        <div>
          <h3 className="font-bold text-foreground text-sm">Хавтангийн тооцоолуур</h3>
          <p className="text-xs text-foreground-muted">Шалны хэмжээгээр хавтан тооцоол</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Room dimensions */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-foreground-muted mb-1">Өрөөний урт (м)</label>
            <input
              type="number"
              value={roomL}
              onChange={(e) => { setRoomL(e.target.value); setResult(null); }}
              placeholder="5.5"
              min="0.1"
              step="0.1"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-foreground-muted mb-1">Өрөөний өргөн (м)</label>
            <input
              type="number"
              value={roomW}
              onChange={(e) => { setRoomW(e.target.value); setResult(null); }}
              placeholder="4.0"
              min="0.1"
              step="0.1"
              className={inputCls}
            />
          </div>
        </div>

        {/* Tile size */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-foreground-muted">Хавтангийн хэмжээ (см)</label>
            <button
              onClick={() => { setUsePreset(!usePreset); setResult(null); }}
              className="text-xs text-brand hover:underline"
            >
              {usePreset ? 'Өөрөө оруулах' : 'Үлгэр сонгох'}
            </button>
          </div>

          {usePreset ? (
            <div className="flex gap-1.5 flex-wrap">
              {TILE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setPreset(p); setResult(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    preset.label === p.label
                      ? 'bg-brand text-white border-brand'
                      : 'border-[var(--glass-border)] text-foreground-muted hover:border-brand/30'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Урт (см)</label>
                <input
                  type="number"
                  value={tileL}
                  onChange={(e) => { setTileL(e.target.value); setResult(null); }}
                  placeholder="60"
                  min="1"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Өргөн (см)</label>
                <input
                  type="number"
                  value={tileW}
                  onChange={(e) => { setTileW(e.target.value); setResult(null); }}
                  placeholder="60"
                  min="1"
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        {/* Waste % */}
        <div>
          <label className="block text-xs text-foreground-muted mb-2">
            Хаягдлын хувь — <span className="text-foreground">{waste}%</span>
          </label>
          <input
            type="range"
            min="5"
            max="20"
            step="5"
            value={waste}
            onChange={(e) => { setWaste(e.target.value); setResult(null); }}
            className="w-full accent-brand"
          />
          <div className="flex justify-between text-xs text-foreground-muted mt-0.5">
            <span>5% (энгийн)</span>
            <span>10% (зохистой)</span>
            <span>20% (нарийн)</span>
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
              className="rounded-xl bg-amber/5 border border-amber/20 p-4"
            >
              <p className="text-xs text-foreground-muted mb-3">
                {result.sqm.toFixed(1)} м² талбайд ({waste}% хаягдлыг оруулаад):
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{result.tiles}</p>
                  <p className="text-xs text-foreground-muted">Хамгийн бага</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber">{result.withWaste}</p>
                  <p className="text-xs text-foreground-muted">Хаягдлтай</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand">{result.boxes}</p>
                  <p className="text-xs text-foreground-muted">Хайрцаг</p>
                </div>
              </div>
              <p className="text-xs text-foreground-muted text-center mt-3">
                💡 1 хайрцагт 10 ширхэг хавтан тооцоолсон
              </p>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
