import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { setApiBase } from "./api/client";
import { ToastProvider } from "./components/Toast";
import "./i18n";
import { net } from "./net/connection";
import { AuthProvider } from "./store/auth";
import "./styles.css";

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

async function boot() {
  try {
    const state = await net.getState();
    if (state.serverUrl) setApiBase(state.serverUrl);
  } catch {
    /* keep default base; the network panel will let the user pick a server */
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={qc}>
        <HashRouter>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </HashRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

boot();
