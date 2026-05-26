export default function CartLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-32 bg-white/5 rounded-xl" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl border border-[var(--glass-border)] p-5 flex gap-4">
            <div className="w-20 h-20 bg-white/5 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/5 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
              <div className="h-4 bg-white/5 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
