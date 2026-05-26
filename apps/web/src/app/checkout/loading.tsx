export default function CheckoutLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div className="flex gap-2 justify-center">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 bg-white/5 rounded-full" />
          ))}
        </div>
        <div className="bg-card rounded-2xl border border-[var(--glass-border)] p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 bg-white/5 rounded" />
              <div className="h-10 bg-white/5 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
