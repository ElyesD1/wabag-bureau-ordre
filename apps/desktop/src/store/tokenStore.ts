interface ElectronApi {
  isElectron: boolean;
  setToken: (t: string | null) => Promise<boolean>;
  getToken: () => Promise<string | null>;
  printReportToPDF?: (html: string) => Promise<{ saved: boolean; filePath?: string }>;
}

function electron(): ElectronApi | null {
  const a = (window as unknown as { api?: ElectronApi }).api;
  return a && a.isElectron ? a : null;
}

const LS_KEY = "bo_token";

export const tokenStore = {
  async get(): Promise<string | null> {
    const e = electron();
    if (e) return e.getToken();
    return localStorage.getItem(LS_KEY);
  },
  async set(t: string | null): Promise<void> {
    const e = electron();
    if (e) {
      await e.setToken(t);
      return;
    }
    if (t) localStorage.setItem(LS_KEY, t);
    else localStorage.removeItem(LS_KEY);
  },
};

export function electronApi(): ElectronApi | null {
  return electron();
}
