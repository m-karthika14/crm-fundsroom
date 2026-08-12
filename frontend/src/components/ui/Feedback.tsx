// Small shared pieces for loading/empty/error states, so every page
// handles these the same way instead of improvising each time.

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-forest-600 border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner />
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-rust-200 bg-rust-50 px-4 py-3 text-sm text-rust-600">
      {message}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
      <p className="font-display text-lg text-ink-soft">{title}</p>
      {hint && <p className="text-sm text-ink-faint">{hint}</p>}
    </div>
  );
}
