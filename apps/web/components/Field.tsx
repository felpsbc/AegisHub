import {
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  forwardRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label className={cn("label", className)} htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-2">
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && (
        <div className="mt-1 text-xs" style={{ color: "var(--text-2)" }}>
          {hint}
        </div>
      )}
      {error && (
        <div className="mt-1 text-xs" style={{ color: "var(--danger)" }} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn("input", className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn("textarea", className)} {...props} />;
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn("select", className)} {...props}>
      {children}
    </select>
  );
});
