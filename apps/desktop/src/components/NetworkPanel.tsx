import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { setApiBase } from "../api/client";
import { isElectron, net, type DiscoveredServer, type NetState } from "../net/connection";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconCheck, IconClose, IconServer, IconWifi } from "./Icons";
import { Sillage } from "./Sillage";

const shortName = (n: string) => n.replace(/^Bureau d'Ordre — /, "");

export function NetworkPanel({
  initialState,
  onClose,
  forced,
}: {
  initialState: NetState;
  onClose: () => void;
  forced?: boolean;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"status" | "choose" | "joining">(initialState.role ? "status" : "choose");
  const [servers, setServers] = useState<DiscoveredServer[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmHost, setConfirmHost] = useState(false);

  useEffect(() => {
    if (mode !== "joining") return;
    let stop = () => {};
    net.discover(setServers).then((s) => {
      stop = s;
    });
    return () => stop();
  }, [mode]);

  async function applyState(st: NetState) {
    if (st.serverUrl) setApiBase(st.serverUrl);
    if (isElectron) {
      window.location.reload();
      return;
    }
    onClose();
  }

  async function doHost() {
    setBusy(true);
    try {
      await applyState(await net.host());
    } finally {
      setBusy(false);
      setConfirmHost(false);
    }
  }

  async function doJoin(s: DiscoveredServer) {
    setBusy(true);
    try {
      await applyState(await net.join(s));
    } finally {
      setBusy(false);
    }
  }

  const statusLine =
    initialState.role === "host" ? t("net.statusHosting") : initialState.role ? t("net.statusConnected") : "";

  return (
    <div className="net-scrim">
      <div className="ripple net-ripple">
        <Sillage className="echo login__echo-pulse" />
        <Sillage className="login__pulse" />
      </div>

      <div className="netcard">
        {!forced && (
          <button className="netcard__close" onClick={onClose} aria-label="Fermer">
            <IconClose width={18} height={18} />
          </button>
        )}

        <div className="netcard__head">
          <div className="netcard__ic"><IconWifi width={22} height={22} /></div>
          <div>
            <h2 className="netcard__title">{mode === "status" ? t("net.title") : t("net.setupTitle")}</h2>
            <p className="netcard__sub">{mode === "status" ? statusLine : t("net.setupHint")}</p>
          </div>
        </div>

        {mode === "status" && (
          <>
            <div className={"net-status " + (initialState.role === "host" ? "hosting" : "connected")}>
              <div className="net-status__ic"><IconCheck width={18} height={18} /></div>
              <div className="net-status__txt">
                <b>{initialState.role === "host" ? t("net.hosting") : t("net.connected")}</b>
                <small>{initialState.serverName}</small>
              </div>
            </div>
            <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => setMode("choose")}>
              {t("net.change")}
            </button>
          </>
        )}

        {mode === "choose" && (
          <div className="net-choices">
            <button className="net-choice" onClick={() => setConfirmHost(true)}>
              <div className="net-choice__ic host"><IconServer width={22} height={22} /></div>
              <b>{t("net.host")}</b>
              <small>{t("net.hostHint")}</small>
            </button>
            <button className="net-choice" onClick={() => setMode("joining")}>
              <div className="net-choice__ic join"><IconWifi width={22} height={22} /></div>
              <b>{t("net.join")}</b>
              <small>{t("net.joinHint")}</small>
            </button>
          </div>
        )}

        {mode === "joining" && (
          <div className="server-list">
            <div className="server-list__head">
              <span className="spin dark" style={{ width: 14, height: 14 }} /> {t("net.scanning")}
            </div>
            {servers.length === 0 ? (
              <div className="server-empty">{t("net.noServers")}</div>
            ) : (
              servers.map((s) => (
                <div className="server-row" key={s.name + s.address}>
                  <div className="server-row__ic"><IconServer width={18} height={18} /></div>
                  <div className="server-row__info">
                    <b>{shortName(s.name)}</b>
                    <small>{s.address}:{s.port}</small>
                  </div>
                  <button className="btn btn--accent" onClick={() => doJoin(s)} disabled={busy}>{t("net.joinBtn")}</button>
                </div>
              ))
            )}
            <button className="muted-link" style={{ marginTop: 12 }} onClick={() => setMode(initialState.role ? "status" : "choose")}>
              ← {t("net.back")}
            </button>
          </div>
        )}

        <p className="net-auto-note">{t("net.autoNote")}</p>
      </div>

      {confirmHost && (
        <ConfirmDialog
          title={t("net.confirmHost")}
          message={t("net.confirmHostMsg")}
          confirmLabel={t("net.host")}
          cancelLabel={t("users.cancel")}
          busy={busy}
          onCancel={() => setConfirmHost(false)}
          onConfirm={doHost}
        />
      )}
    </div>
  );
}
