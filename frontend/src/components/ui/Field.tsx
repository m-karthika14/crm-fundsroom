// Field: wraps a label + input/select + optional error message, so
// every form field looks and behaves the same without repeating the
// markup. Pass any input-like element as children.

import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-soft">
        {label}
        {required && <span className="text-rust-500"> *</span>}
      </label>
      {children}
      {error && <p className="text-sm text-rust-600">{error}</p>}
    </div>
  );
}

const baseInputClasses =
  "h-10 w-full rounded-md border border-border bg-paper-raised px-3 text-sm text-ink placeholder:text-ink-faint focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20";

export function inputClasses(hasError?: boolean) {
  return `${baseInputClasses} ${hasError ? "border-rust-400 focus:border-rust-500 focus:ring-rust-500/20" : ""}`;
}
