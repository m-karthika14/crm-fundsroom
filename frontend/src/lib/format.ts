// Small formatting helpers shared across pages, so dates/money/etc.
// look the same everywhere instead of each page rolling its own.

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

// "Is this date today or earlier?" -- used to flag a customer's
// follow-up as due/overdue rather than merely scheduled.
export function isDueOrOverdue(value: string | null | undefined): boolean {
  if (!value) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return new Date(value).getTime() <= today.getTime();
}
