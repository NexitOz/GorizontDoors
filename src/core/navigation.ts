export function validPage(value: unknown) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= 11 ? page : 1;
}
export function visiblePages(page: number, spread: boolean): number[] {
  page = validPage(page);
  if (!spread || page === 1 || page >= 10) return [page];
  const start = page % 2 === 0 ? page : page - 1;
  return [start, start + 1];
}
export function adjacentPage(page: number, spread: boolean, direction: 1 | -1) {
  const visible = visiblePages(page, spread);
  return Math.max(1, Math.min(11, direction > 0 ? visible.at(-1)! + 1 : visible[0] - 1));
}
export function swipeDecision(dx: number, dy: number, duration: number, width: number) {
  if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.3) return 0;
  const fast = Math.abs(dx) > 42 && Math.abs(dx) / Math.max(duration, 1) > 0.5;
  return Math.abs(dx) > width * 0.18 || fast ? (dx < 0 ? 1 : -1) : 0;
}
