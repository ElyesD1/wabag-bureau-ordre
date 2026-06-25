import { FALLBACK, KB, type Intent } from "./kb";

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function match(input: string): Intent {
  const t = ` ${norm(input)} `;
  let best: Intent | null = null;
  let bestScore = 0;
  for (const intent of KB) {
    let score = 0;
    for (const k of intent.kw) {
      const nk = norm(k);
      if (!nk) continue;
      if (t.includes(` ${nk} `)) score += nk.length + 4; // whole-word/phrase bonus
      else if (t.includes(nk)) score += nk.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }
  return bestScore > 0 && best ? best : FALLBACK;
}
