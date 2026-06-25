import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, api, apiBase } from "../api/client";
import { IconGear } from "../components/Icons";
import { useToast } from "../components/Toast";
import i18n from "../i18n";
import { getOverdueDays, setOverdueDays } from "../lib/prefs";
import { useAuth } from "../store/auth";

export function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const lang = i18n.language.startsWith("en") ? "en" : "fr";
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [cf, setCf] = useState("");
  const [busy, setBusy] = useState(false);
  const [overdue, setOverdue] = useState(getOverdueDays());

  function setLang(l: "fr" | "en") {
    i18n.changeLanguage(l);
    api.setLocale(l).catch(() => {});
  }

  async function changePassword() {
    if (nw !== cf) {
      toast(t("settings.passwordMismatch"), "err");
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(cur, nw);
      toast(t("settings.passwordChanged"), "ok");
      setCur("");
      setNw("");
      setCf("");
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 400 ? e.message : t("toast.error");
      toast(msg, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="content">
      <div className="page-head">
        <div className="page-head__icon"><IconGear width={24} height={24} /></div>
        <div>
          <h1 className="page-title">{t("settings.title")}</h1>
          <p className="page-sub">{t("settings.subtitle")}</p>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card__title">{t("settings.account")}</div>
          <div className="detail-meta" style={{ marginBottom: 18 }}>
            <div className="dm"><div className="k">{t("users.fullName")}</div><div className="v">{user?.full_name}</div></div>
            <div className="dm"><div className="k">{t("users.username")}</div><div className="v mono-row">{user?.username}</div></div>
            <div className="dm"><div className="k">{t("settings.role")}</div><div className="v">{user?.role === "admin" ? t("users.admin") : t("users.clerk")}</div></div>
          </div>
          <div className="detail-sec" style={{ marginTop: 0 }}>{t("settings.changePassword")}</div>
          <label className="form-label">{t("settings.currentPassword")}</label>
          <input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
          <div style={{ height: 12 }} />
          <label className="form-label">{t("settings.newPassword")}</label>
          <input className="input" type="password" value={nw} onChange={(e) => setNw(e.target.value)} />
          <div style={{ height: 12 }} />
          <label className="form-label">{t("settings.confirmPassword")}</label>
          <input className="input" type="password" value={cf} onChange={(e) => setCf(e.target.value)} />
          <div style={{ height: 16 }} />
          <button className="btn-save" onClick={changePassword} disabled={busy || !cur || nw.length < 6}>
            {busy ? <span className="spin" /> : t("settings.changePassword")}
          </button>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__title">{t("settings.language")}</div>
            <p style={{ color: "var(--wabag-gray)", fontSize: 12.5, margin: "0 0 14px" }}>{t("settings.languageHint")}</p>
            <div className="lang" style={{ width: "fit-content" }}>
              <button className={lang === "fr" ? "active" : ""} onClick={() => setLang("fr")}>FR</button>
              <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            </div>
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__title">{t("settings.monitoring")}</div>
            <label className="form-label">{t("settings.overdueThreshold")}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                className="input"
                type="number"
                min={1}
                max={365}
                value={overdue}
                style={{ width: 100 }}
                onChange={(e) => {
                  const n = Number(e.target.value) || 7;
                  setOverdue(n);
                  setOverdueDays(n);
                }}
              />
              <span style={{ color: "var(--wabag-gray)", fontSize: 13 }}>{t("settings.overdueUnit")}</span>
            </div>
            <p style={{ color: "var(--wabag-gray)", fontSize: 12, margin: "10px 0 0" }}>{t("settings.overdueHint")}</p>
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__title">{t("settings.server")}</div>
            <p style={{ color: "var(--wabag-gray)", fontSize: 12.5, margin: "0 0 10px" }}>{t("settings.serverHint")}</p>
            <div className="mono-row" style={{ fontSize: 13, color: "var(--wabag-blue)" }}>{apiBase()}</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <img src="./wabag-logo.png" alt="WABAG" style={{ height: 30, margin: "6px auto 14px", display: "block" }} />
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Bureau d'Ordre</div>
            <div className="mono-row" style={{ marginTop: 4 }}>{t("settings.version")} 1.0.0</div>
            <button
              className="btn"
              style={{ margin: "14px auto 0" }}
              onClick={() => window.open("./guide.html", "_blank")}
            >
              {t("settings.guide")}
            </button>
            <div style={{ fontSize: 11.5, color: "var(--wabag-gray)", marginTop: 12, fontStyle: "italic" }}>
              sustainable solutions. for a better life.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
