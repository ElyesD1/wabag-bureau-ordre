// Connection layer: abstracts "host / join / discover" so the renderer works
// both inside Electron (real mDNS + server supervisor) and in the browser
// (a mock, for dev + visual verification).

export interface DiscoveredServer {
  name: string;
  host: string;
  address: string;
  port: number;
  url: string;
}

export type NetStatus = "setup" | "connecting" | "connected" | "hosting" | "offline";

export interface NetState {
  role: "host" | "client" | null;
  serverName: string | null;
  serverUrl: string | null;
  status: NetStatus;
}

export interface NetApi {
  isElectron: boolean;
  getState(): Promise<NetState>;
  discover(cb: (servers: DiscoveredServer[]) => void): Promise<() => void>;
  host(): Promise<NetState>;
  join(server: DiscoveredServer): Promise<NetState>;
  leave(): Promise<NetState>;
}

const electronNet = (window as unknown as { netapi?: NetApi }).netapi;

// ---- Browser mock (dev / Playwright verification) ----
const MOCK_SERVERS: DiscoveredServer[] = [
  { name: "Bureau d'Ordre — POSTE-ACCUEIL", host: "poste-accueil.local", address: "192.168.1.20", port: 8099, url: "http://localhost:8099" },
  { name: "Bureau d'Ordre — PC-COMPTABILITE", host: "pc-compta.local", address: "192.168.1.34", port: 8099, url: "http://192.168.1.34:8099" },
];

let mockState: NetState = {
  role: "client",
  serverName: "Bureau d'Ordre — POSTE-ACCUEIL",
  serverUrl: "http://localhost:8099",
  status: "connected",
};

const browserNet: NetApi = {
  isElectron: false,
  async getState() {
    return mockState;
  },
  async discover(cb) {
    const t1 = setTimeout(() => cb([MOCK_SERVERS[0]]), 500);
    const t2 = setTimeout(() => cb(MOCK_SERVERS), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  },
  async host() {
    mockState = { role: "host", serverName: "Bureau d'Ordre — CE POSTE", serverUrl: "http://localhost:8099", status: "hosting" };
    return mockState;
  },
  async join(server) {
    mockState = { role: "client", serverName: server.name, serverUrl: server.url, status: "connected" };
    return mockState;
  },
  async leave() {
    mockState = { role: null, serverName: null, serverUrl: null, status: "setup" };
    return mockState;
  },
};

export const net: NetApi = electronNet ?? browserNet;
export const isElectron = !!electronNet;
