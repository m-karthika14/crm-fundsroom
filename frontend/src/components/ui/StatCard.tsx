// StatCard: a dashboard tile showing a big number, a label, and a
// short preview list underneath -- used for low stock / pending
// follow-ups / draft challans. Clicking the card navigates to the
// filtered list view for that stat.

import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Card } from "./Card";

interface StatCardProps {
  label: string;
  count: number;
  tone: "amber" | "forest" | "rust";
  to: string;
  children?: ReactNode;
}

const toneClasses = {
  amber: "text-amber-600",
  forest: "text-forest-600",
  rust: "text-rust-500",
};

export function StatCard({ label, count, tone, to, children }: StatCardProps) {
  return (
    <Card className="flex flex-col p-5">
      <Link to={to} className="group">
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        <p className={`font-tabular mt-1 text-3xl font-semibold ${toneClasses[tone]}`}>{count}</p>
      </Link>
      {children && <div className="mt-4 space-y-2 border-t border-border pt-4">{children}</div>}
    </Card>
  );
}
