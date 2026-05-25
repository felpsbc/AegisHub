/**
 * Helpers de formatação compartilhados pelas telas.
 */

const palettes = ["blue", "purple", "coral", "teal", "stone"] as const;
export type Palette = (typeof palettes)[number];

export function hashColor(name: string): Palette {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return palettes[h % palettes.length] ?? "stone";
}

export function initials(name: string): string {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0] ?? "")
    .join("")
    .toUpperCase();
}

export function formatBRL(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "agora há pouco";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `há ${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString("pt-BR");
}
