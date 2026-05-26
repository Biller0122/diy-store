'use client';

import { ClipboardEvent, KeyboardEvent, useRef, useState } from 'react';
import { m } from 'framer-motion';

const OTP_POSITIONS = [0, 1, 2, 3];

export default function OTPInput({
  onComplete,
  error,
}: {
  onComplete: (otp: string) => void;
  error?: string;
}) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function update(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = OTP_POSITIONS.map((position) => digits[position] ?? '');
    next[index] = digit;
    setDigits(next);
    if (digit && index < 3) refs.current[index + 1]?.focus();
    const code = next.join('');
    if (code.length === 4) onComplete(code);
  }

  function keyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function paste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const value = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!value) return;
    const next = OTP_POSITIONS.map((position) => value[position] ?? '');
    setDigits(next);
    refs.current[Math.min(value.length, 3)]?.focus();
    if (value.length === 4) onComplete(value);
  }

  return (
    <m.div
      animate={error ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-2"
    >
      <div className="flex justify-center gap-3">
        {OTP_POSITIONS.map((index) => (
          <input
            key={index}
            ref={(node) => { refs.current[index] = node; }}
            value={digits[index] ?? ''}
            onChange={(event) => update(index, event.target.value)}
            onKeyDown={(event) => keyDown(index, event)}
            onPaste={paste}
            inputMode="numeric"
            maxLength={1}
            className={`h-14 w-14 rounded-2xl border bg-card text-center text-2xl font-black text-foreground outline-none transition focus:border-brand/60 ${
              error ? 'border-error/70' : 'border-[var(--glass-border)]'
            }`}
          />
        ))}
      </div>
      {error && <p className="text-center text-xs text-error">{error}</p>}
    </m.div>
  );
}
