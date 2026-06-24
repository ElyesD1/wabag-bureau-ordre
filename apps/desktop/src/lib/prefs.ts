const KEY = "bo_overdue_days";

export function getOverdueDays(): number {
  const n = Number(localStorage.getItem(KEY));
  return n >= 1 ? n : 7;
}

export function setOverdueDays(n: number): void {
  localStorage.setItem(KEY, String(Math.max(1, Math.min(365, n))));
}
