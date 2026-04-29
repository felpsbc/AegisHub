import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export const Pill = forwardRef<HTMLButtonElement, Props>(function Pill(
  { active = false, className, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn("pill", active && "pill-active", className)}
      {...props}
    />
  );
});
