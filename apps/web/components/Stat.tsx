import { type CSSProperties, type ReactNode } from "react";

export function Stat({
  num,
  label,
  style,
}: {
  num: ReactNode;
  label: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="stat" style={style}>
      <span className="stat-num">{num}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
