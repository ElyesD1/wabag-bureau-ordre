const ARCS: [string, number][] = [
  ["M430 20 C 70 130, 70 330, 430 440", 11],
  ["M430 55 C 140 150, 140 310, 430 405", 10],
  ["M430 90 C 200 165, 200 295, 430 370", 9],
  ["M430 125 C 255 180, 255 280, 430 335", 8],
  ["M430 160 C 305 195, 305 265, 430 300", 7],
  ["M430 198 C 350 212, 350 248, 430 262", 6],
];

export function Sillage({ className, stroke }: { className?: string; stroke?: string }) {
  return (
    <svg className={className} viewBox="0 0 460 460" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {ARCS.map(([d, w], i) => (
        <path key={i} className="arc" d={d} strokeWidth={w} stroke={stroke} />
      ))}
    </svg>
  );
}
