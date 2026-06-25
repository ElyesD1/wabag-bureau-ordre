import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Sillage } from "../components/Sillage";
import { useAuth } from "../store/auth";

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(false);
    try {
      await login(u, p);
      nav("/entree", { replace: true });
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="login">
      <div className="ripple login__ripple">
        <Sillage className="echo login__echo-pulse" />
        <Sillage className="login__pulse" />
      </div>
      <form className="login__card" onSubmit={submit}>
        <img className="login__logo" src="./wabag-logo.png" alt="WABAG" />
        <p className="login__eyebrow">{t("login.eyebrow")}</p>
        <h1 className="login__title">{t("login.title")}</h1>
        <p className="login__sub">{t("login.subtitle")}</p>
        {err && <div className="login__err">{t("login.error")}</div>}
        <div className="field">
          <label className="field__label">{t("login.user")}</label>
          <input className="field__input" value={u} onChange={(e) => setU(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label className="field__label">{t("login.password")}</label>
          <input
            className="field__input"
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
          />
        </div>
        <button className="btn-primary" disabled={busy}>
          {busy ? <span className="spin" /> : t("login.submit")}
        </button>
        <div className="login__foot">
          <span className="login__tag">
            sustainable solutions. <b>for a better life.</b>
          </span>
          <span>v1.0</span>
        </div>
      </form>
    </section>
  );
}
