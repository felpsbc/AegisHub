"use client";

import { Check } from "lucide-react";

export function CheckboxRow({
  label,
  checked,
  onChange,
  count,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="box">{checked && <Check size={10} strokeWidth={3} />}</span>
      <span>{label}</span>
      {count != null && <span className="count">{count}</span>}
    </label>
  );
}
