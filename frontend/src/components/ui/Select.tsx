import type { SelectHTMLAttributes } from "react";
import { inputClasses } from "./Field";

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputClasses()} ${className}`} {...rest}>
      {children}
    </select>
  );
}
