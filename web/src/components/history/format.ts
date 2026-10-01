// Formatting helpers specific to the history/progression feature -- kept
// local to this component group rather than lib/utils.ts since the
// today/yesterday phrasing and the chart's y-axis mapping only make sense
// here, not as general-purpose utilities.

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function fullDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isSameDay = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (isSameDay) return `Hôm nay, ${time}`;
  if (isYesterday) return `Hôm qua, ${time}`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) + `, ${time}`;
}

// Grade 4 (severe) plots near the top -- a rising line reads as "getting
// worse", the fever-chart convention. 15/85 leaves headroom for the photo
// thumbnails at the extremes.
export function yPercent(grade: number): number {
  return 15 + (4 - grade) * 17.5;
}
