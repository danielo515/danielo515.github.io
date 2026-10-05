// Render seconds as a compact gym-style rest label: 40 → 40'', 60 → 1', 90 → 1'30''.
export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m && s) return `${m}'${String(s).padStart(2, "0")}''`;
  if (m) return `${m}'`;
  return `${s}''`;
}

// Render seconds as a mm:ss stopwatch clock.
export function fmtClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
