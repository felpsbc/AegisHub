"use client";

export function RadioRow({
  label,
  name,
  value,
  checked,
  onChange,
  count,
}: {
  label: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  count?: number;
}) {
  return (
    <label className="checkbox">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      <span
        className="box"
        style={{ borderRadius: 999 }}
        aria-hidden="true"
      >
        {checked && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "currentColor",
              display: "inline-block",
            }}
          />
        )}
      </span>
      <span>{label}</span>
      {count != null && <span className="count">{count}</span>}
    </label>
  );
}
