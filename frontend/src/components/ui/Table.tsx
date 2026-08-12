// Table: thin styled wrappers around plain <table> markup so every
// list page (Customers, Products, Challans) shares the same look --
// header row on a faint tint, hover state per row, consistent padding.

import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className = "", ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-paper-raised shadow-card">
      <table className={`w-full border-collapse text-sm ${className}`} {...rest} />
    </div>
  );
}

export function THead({ ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-ink/[0.03]" {...rest} />;
}

export function TH({ className = "", ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint ${className}`}
      {...rest}
    />
  );
}

export function TR({ className = "", ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`border-t border-border first:border-t-0 ${className}`} {...rest} />;
}

export function TD({ className = "", ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-3 align-middle text-ink ${className}`} {...rest} />;
}
