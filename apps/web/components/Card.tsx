import { type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  pad?: "sm" | "md" | "lg";
};

const PAD: Record<NonNullable<CardProps["pad"]>, string> = {
  sm: "card-pad-sm",
  md: "",
  lg: "card-pad-lg",
};

export function Card({ className, pad = "md", ...props }: CardProps) {
  return <div className={cn("card", PAD[pad], className)} {...props} />;
}

export function CardSection({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("col gap-2", className)} {...props} />;
}
