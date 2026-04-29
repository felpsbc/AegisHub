import { type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";
import type { Palette } from "@/lib/mock";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Palette;
};

export function Tag({ tone = "stone", className, ...props }: Props) {
  return <span className={cn("tag", `tag-${tone}`, className)} {...props} />;
}
