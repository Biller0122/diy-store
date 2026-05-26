export default function DriverLoading() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
        <p className="text-xs text-foreground-muted animate-pulse">Ачааллаж байна...</p>
      </div>
    </div>
  );
}
