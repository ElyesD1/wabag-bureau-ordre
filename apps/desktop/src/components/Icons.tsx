import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconGrid = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const IconIn = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M20 12H7" /><path d="M11 8l-4 4 4 4" /><path d="M4 4v16" /></svg>
);
export const IconOut = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 12h13" /><path d="M13 8l4 4-4 4" /><path d="M20 4v16" /></svg>
);
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M17 7.5a3 3 0 0 1 0 5.6" /><path d="M19.5 20a5 5 0 0 0-3-4.6" /></svg>
);
export const IconGear = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" /></svg>
);
export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
);
export const IconBell = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M10.5 21a1.8 1.8 0 0 0 3 0" /></svg>
);
export const IconFile = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
);
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3v12" /><path d="M8 11l4 4 4-4" /><path d="M5 21h14" /></svg>
);
export const IconUpload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={1.6}><path d="M12 16V5" /><path d="M8 9l4-4 4 4" /><path d="M5 19h14" /></svg>
);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconChevron = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2}><path d="M6 9l6 6 6-6" /></svg>
);
export const IconEdit = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
