import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-forest-600 text-white hover:bg-forest-700 focus-visible:outline-forest-600 disabled:bg-forest-300",
  secondary:
    "bg-paper-raised text-ink border border-border hover:bg-paper focus-visible:outline-forest-600 disabled:text-ink-faint",
  ghost:
    "bg-transparent text-ink-soft hover:bg-ink/5 focus-visible:outline-forest-600",
  danger:
    "bg-rust-500 text-white hover:bg-rust-600 focus-visible:outline-rust-500 disabled:bg-rust-200",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {isLoading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
