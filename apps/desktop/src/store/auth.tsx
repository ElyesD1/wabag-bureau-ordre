import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import i18n from "../i18n";
import { api, setApiToken } from "../api/client";
import type { User } from "../types";
import { tokenStore } from "./tokenStore";

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await tokenStore.get();
      if (t) {
        setApiToken(t);
        try {
          const me: User = await api.me();
          setUser(me);
          if (me.preferred_locale) i18n.changeLanguage(me.preferred_locale);
        } catch {
          setApiToken(null);
          await tokenStore.set(null);
        }
      }
      setReady(true);
    })();
  }, []);

  async function login(username: string, password: string) {
    const tok = await api.login(username, password);
    setApiToken(tok.access_token);
    await tokenStore.set(tok.access_token);
    const me: User = await api.me();
    setUser(me);
    if (me.preferred_locale) i18n.changeLanguage(me.preferred_locale);
  }

  function logout() {
    setApiToken(null);
    tokenStore.set(null);
    setUser(null);
  }

  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}
