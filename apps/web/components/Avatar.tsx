import { cn } from "@/lib/cn";
import { hashColor, initials, type Palette } from "@/lib/format";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLS: Record<Size, string> = {
  sm: "avatar avatar-sm",
  md: "avatar",
  lg: "avatar avatar-lg",
  xl: "avatar avatar-xl",
};

export function Avatar({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color?: Palette;
  size?: Size;
  className?: string;
}) {
  const palette = color ?? hashColor(name);
  return (
    <span
      className={cn(SIZE_CLS[size], `av-${palette}`, className)}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
