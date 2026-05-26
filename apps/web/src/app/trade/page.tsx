'use client';

import { useState, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';

// ─── Benefit cards data ───────────────────────────────────────

const BENEFITS = [
  {
    icon: '💰',
    title: 'Тусгай үнэ',
    desc: '500,000₮-с дээш захиалгад онцгой хөнгөлөлт. Тогтмол хамтрагчдад нэмэлт урамшуулал.',
    color: 'from-amber/20 to-amber/5',
    border: 'border-amber/20',
  },
  {
    icon: '📋',
    title: 'Үнийн санал',
    desc: '24 цагийн дотор мэргэжлийн менежер тантай холбогдоно. Дэлгэрэнгүй тооцоолол гаргана.',
    color: 'from-info/20 to-info/5',
    border: 'border-info/20',
  },
  {
    icon: '🚚',
    title: 'Тэргүүлэх хүргэлт',
    desc: 'Байгууллагын захиалгыг нэн тэргүүнд боловсруулна. Томоохон тоо хэмжээнд ачааны машин.',
    color: 'from-success/20 to-success/5',
    border: 'border-success/20',
  },
  {
    icon: '🧾',
    title: 'НӨАТ-ын баримт',
    desc: 'Бүх захиалгад НӨАТ-ын бүрэн баримт бичиг. И-баримт болон цаасан баримт хоёуланг олгоно.',
    color: 'from-brand/20 to-brand/5',
    border: 'border-brand/20',
  },
];

const TRUSTED = [
  { name: 'Монгол Гэр ХХК', logo: '🏢' },
  { name: 'Хаан Барилга', logo: '🏗️' },
  { name: 'Эрдэнэт Засвар', logo: '🔧' },
  { name: 'Нийслэл Инфра', logo: '🏙️' },
  { name: 'Голомт Хөгжлийн', logo: '💼' },
  { name: 'Тэнгэр Констракшн', logo: '🏛️' },
];

const EMPTY_FORM = {
  company: '',
  regno: '',
  contact: '',
  phone: '',
  email: '',
  description: '',
};

// ─── Success animation ────────────────────────────────────────

function SuccessState({ onReset }: { onReset: () => void }) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center py-12 px-6"
    >
      {/* Animated checkmark */}
      <m.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mb-6"
      >
        <m.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl"
        >
          ✅
        </m.span>
      </m.div>

      <h3 className="text-2xl font-bold text-foreground mb-2">Амжилттай илгээгдлээ!</h3>
      <p className="text-foreground-muted text-sm max-w-xs mb-1">
        Таны хүсэлтийг хүлээн авлаа.
      </p>
      <p className="text-brand font-semibold text-sm mb-8">
        🕐 24 цагийн дотор менежер холбогдоно
      </p>

      <div className="bg-dark rounded-2xl p-4 w-full max-w-xs mb-6 text-left space-y-2">
        <p className="text-xs text-foreground-muted">Дараагийн алхам:</p>
        {['Имэйл хаягаа шалгаарай', 'Менежертэй ярилцлага', 'Үнийн санал хүлээн авах'].map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-foreground">
            <span className="w-5 h-5 rounded-full bg-brand/20 text-brand text-xs flex items-center justify-center font-bold">{i + 1}</span>
            {step}
          </div>
        ))}
      </div>

      <button
        onClick={onReset}
        className="text-sm text-foreground-muted hover:text-foreground underline underline-offset-2 transition-colors"
      >
        Шинэ хүсэлт илгээх
      </button>
    </m.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function TradePage() {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof form, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.company.trim()) e.company = 'Байгууллагын нэр оруулна уу';
    if (!form.contact.trim()) e.contact = 'Холбоо барих хүний нэр оруулна уу';
    if (!form.phone.trim()) e.phone = 'Утасны дугаар оруулна уу';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Зөв и-мэйл оруулна уу';
    if (!form.description.trim()) e.description = 'Захиалгын тайлбар оруулна уу';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500)); // Simulate API call
    setLoading(false);
    setSuccess(true);
  };

  const inputCls = (key: keyof typeof form) =>
    `w-full rounded-xl border px-4 py-3 text-sm bg-dark text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-brand transition-colors ${
      errors[key]
        ? 'border-error/50 focus:ring-error/40'
        : 'border-[var(--glass-border)] focus:border-brand/30'
    }`;

  const Field = ({
    label,
    k,
    required = false,
    type = 'text',
    placeholder,
  }: {
    label: string;
    k: keyof typeof form;
    required?: boolean;
    type?: string;
    placeholder: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-foreground-muted mb-1.5">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        type={type}
        value={form[k]}
        onChange={(e) => set(k, e.target.value)}
        placeholder={placeholder}
        className={inputCls(k)}
      />
      {errors[k] && <p className="text-xs text-error mt-1">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-dark">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background mesh */}
        <div className="absolute inset-0 gradient-mesh opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark" />

        {/* Animated orbs */}
        <m.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-brand/20 blur-3xl pointer-events-none"
        />
        <m.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
          className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-amber/10 blur-3xl pointer-events-none"
        />

        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center">
          <m.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-semibold mb-6 tracking-wider uppercase"
          >
            🏢 Байгууллагын нийлүүлэгч
          </m.span>

          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight mb-4"
          >
            Байгууллагын
            <br />
            <span className="gradient-text">захиалга</span>
          </m.h1>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-foreground-muted mb-8 max-w-md mx-auto"
          >
            Тусгай үнэ. Зээлийн нөхцөл. Хурдан хүргэлт.
          </m.p>

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-3 justify-center text-sm text-foreground-muted"
          >
            {['500,000₮-с дээш хөнгөлөлт', 'Зээлийн нөхцөл', 'НӨАТ-ын баримт', '24/7 дэмжлэг'].map((tag) => (
              <span key={tag} className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                {tag}
              </span>
            ))}
          </m.div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.map((b, i) => (
            <m.div
              key={b.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl bg-gradient-to-br ${b.color} border ${b.border} p-5`}
            >
              <span className="text-3xl mb-3 block">{b.icon}</span>
              <h3 className="font-bold text-foreground mb-2">{b.title}</h3>
              <p className="text-xs text-foreground-muted leading-relaxed">{b.desc}</p>
            </m.div>
          ))}
        </div>
      </section>

      {/* ── Process steps ── */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <h2 className="text-center text-2xl font-bold text-foreground mb-10">
          Хэрхэн ажилладаг вэ?
        </h2>
        <div className="relative">
          <div className="hidden md:block absolute top-5 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-brand/0 via-brand/40 to-brand/0" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', icon: '📝', title: 'Хүсэлт илгээх', desc: 'Доорх маягтыг бөглөж материалын жагсаалтаа хавсаргана уу' },
              { step: '02', icon: '📞', title: 'Менежер холбогдоно', desc: '24 цагийн дотор мэргэжилтэн тантай холбогдож дэлгэрэнгүй ярилцана' },
              { step: '03', icon: '💰', title: 'Үнийн санал', desc: 'Тусгай үнэ, нөхцөл бүхий арилжааны санал хүргэнэ' },
              { step: '04', icon: '🚚', title: 'Хүргэлт', desc: 'Тохиролцсон хугацаанд нэн тэргүүнд хүргэнэ' },
            ].map((s, i) => (
              <m.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative w-10 h-10 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center mb-3 z-10">
                  <span className="text-lg">{s.icon}</span>
                </div>
                <p className="text-xs font-mono text-brand mb-1">{s.step}</p>
                <p className="font-semibold text-foreground text-sm mb-1">{s.title}</p>
                <p className="text-xs text-foreground-muted leading-relaxed">{s.desc}</p>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quote Form ── */}
      <section className="mx-auto max-w-2xl px-4 pb-16" id="quote-form">
        <m.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card rounded-3xl border border-[var(--glass-border)] overflow-hidden"
        >
          <div className="bg-gradient-to-r from-brand/10 to-amber/5 border-b border-[var(--glass-border)] px-6 py-5">
            <h2 className="text-xl font-bold text-foreground">Үнийн санал авах</h2>
            <p className="text-sm text-foreground-muted mt-0.5">
              Маягтыг бөглөн илгээснээс хойш 24 цагт холбогдоно
            </p>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <SuccessState key="success" onReset={() => { setSuccess(false); setForm({ ...EMPTY_FORM }); setFile(null); }} />
            ) : (
              <m.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSubmit}
                className="p-6 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Байгууллагын нэр" k="company" required placeholder="Монгол Гэр ХХК" />
                  <Field label="Регистрийн дугаар" k="regno" placeholder="1234567" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Холбоо барих хүн" k="contact" required placeholder="Б. Болд" />
                  <Field label="Утасны дугаар" k="phone" required type="tel" placeholder="9911-2233" />
                </div>

                <Field label="И-мэйл хаяг" k="email" required type="email" placeholder="info@company.mn" />

                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                    Захиалгын тайлбар <span className="text-error">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Хэрэгтэй барааны жагсаалт, тоо хэмжээ, хүргэлтийн хугацаа болон бусад шаардлагыг бичнэ үү..."
                    rows={4}
                    className={`w-full rounded-xl border px-4 py-3 text-sm bg-dark text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-brand transition-colors resize-none ${
                      errors.description ? 'border-error/50' : 'border-[var(--glass-border)]'
                    }`}
                  />
                  {errors.description && <p className="text-xs text-error mt-1">{errors.description}</p>}
                </div>

                {/* File upload */}
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                    Материалын жагсаалт хавсаргах
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-xl border border-dashed border-[var(--glass-border)] px-4 py-4 text-sm text-center text-foreground-muted hover:border-brand/40 hover:text-foreground transition-colors"
                  >
                    {file ? (
                      <span className="flex items-center justify-center gap-2 text-foreground">
                        <span>📄</span>
                        <span className="truncate max-w-xs">{file.name}</span>
                        <span className="text-foreground-muted text-xs">({(file.size / 1024).toFixed(0)} KB)</span>
                      </span>
                    ) : (
                      <>
                        <span className="block text-xl mb-1">📁</span>
                        PDF, Excel эсвэл Word файл хавсаргах
                        <span className="block text-xs mt-0.5 text-foreground-muted/60">Max 10MB</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-hover transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Илгээж байна...
                    </>
                  ) : (
                    '📋 Үнийн санал авах'
                  )}
                </button>

                <p className="text-xs text-center text-foreground-muted">
                  Хүсэлт илгээснээр та манай{' '}
                  <span className="text-brand cursor-pointer hover:underline">нийлүүлэгчийн нөхцөл</span>-тэй зөвшөөрч байна
                </p>
              </m.form>
            )}
          </AnimatePresence>
        </m.div>
      </section>

      {/* ── Trusted by ── */}
      <section className="border-t border-[var(--glass-border)] py-12 px-4">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-sm text-foreground-muted mb-8">
            Манайд итгэдэг байгууллагууд
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {TRUSTED.map((t, i) => (
              <m.div
                key={t.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-colors"
              >
                <span className="text-2xl">{t.logo}</span>
                <p className="text-xs text-foreground-muted text-center leading-tight">{t.name}</p>
              </m.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
