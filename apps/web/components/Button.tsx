import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

const VARIANT: Record<Variant, string> = {
  primary: "btn btn-primary",
  secondary: "btn",
  ghost: "btn btn-ghost",
};

const SIZE: Record<Size, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "secondary", size = "md", block = false, className, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(VARIANT[variant], SIZE[size], block && "btn-block", className)}
      {...props}
    />
  );
});
