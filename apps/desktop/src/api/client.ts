const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8099";

let token: string | null = null;
export function setApiToken(t: string | null) {
  token = t;
}
export function apiBase() {
  return BASE;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ReqOpts extends Omit<RequestInit, "body"> {
  json?: unknown;
  body?: BodyInit;
  raw?: boolean;
}

async function req(path: string, opts: ReqOpts = {}): Promise<any> {
  const headers = new Headers(opts.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = opts.body;
  if (opts.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.json);
  }
  const res = await fetch(BASE + path, { ...opts, headers, body });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = (j && (j.detail || j.message)) || detail;
    } catch {
      /* non-json error */
    }
    throw new ApiError(res.status, detail);
  }
  if (opts.raw) return res;
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  login: (username: string, password: string) =>
    req("/auth/login", { method: "POST", json: { username, password } }),
  me: () => req("/auth/me"),
  list: (register: string, params: Record<string, string | number | undefined>) =>
    req(`/registers/${register}/documents${qs(params)}`),
  create: (register: string, data: Record<string, unknown>) =>
    req(`/registers/${register}/documents`, { method: "POST", json: data }),
  updateStatus: (id: string, data: { new_status: string; note?: string }) =>
    req(`/documents/${id}/status`, { method: "PATCH", json: data }),
  uploadPdf: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return req(`/documents/${id}/pdf`, { method: "POST", body: fd });
  },
  reportData: (register: string, params: Record<string, string | undefined>) =>
    req(`/reports/journal-data${qs({ register, ...params })}`),
  exportXlsx: async (register: string, params: Record<string, string | undefined>): Promise<Blob> => {
    const res: Response = await req(`/export/journal.xlsx${qs({ register, ...params })}`, { raw: true });
    return res.blob();
  },
  getDoc: (id: string) => req(`/documents/${id}`),
  updateDoc: (id: string, data: Record<string, unknown>) =>
    req(`/documents/${id}`, { method: "PATCH", json: data }),
  viewPdf: async (id: string): Promise<Blob> => {
    const res: Response = await req(`/documents/${id}/pdf`, { raw: true });
    return res.blob();
  },
  stats: (year?: number) => req(`/stats/dashboard${year ? `?year=${year}` : ""}`),
  setLocale: (locale: string) =>
    req("/users/me/locale", { method: "PATCH", json: { preferred_locale: locale } }),
  users: {
    list: () => req("/users"),
    create: (data: Record<string, unknown>) => req("/users", { method: "POST", json: data }),
    update: (id: string, data: Record<string, unknown>) =>
      req(`/users/${id}`, { method: "PATCH", json: data }),
    resetPassword: (id: string, password: string) =>
      req(`/users/${id}/password`, { method: "POST", json: { password } }),
  },
};
