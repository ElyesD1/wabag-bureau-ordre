import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import i18n from "../i18n";
import { IconSearch } from "./Icons";

export function Topbar() {
  const { t } = useTranslation();
  const { register } = useParams();
  const reg = register === "sortie" ? "sortie" : "entree";
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") || "";

  function setQ(v: string) {
    const n = new URLSearchParams(sp);
    if (v) n.set("q", v);
    else n.delete("q");
    n.delete("page");
    setSp(n, { replace: true });
  }

  const lang = i18n.language.startsWith("en") ? "en" : "fr";

  return (
    <header className="top">
      <div className="crumb">
        <span>{t("app.menu")}</span>
        <span className="crumb__sep">/</span>
        <b>{reg === "entree" ? t("filters.entree") : t("filters.sortie")}</b>
        <span className="crumb__sep">/</span>
        <span>Journal</span>
      </div>
      <div className="search">
        <IconSearch width={17} height={17} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("journal.search")} />
      </div>
      <div className="spacer" />
      <div className="lang">
        <button className={lang === "fr" ? "active" : ""} onClick={() => i18n.changeLanguage("fr")}>
          FR
        </button>
        <button className={lang === "en" ? "active" : ""} onClick={() => i18n.changeLanguage("en")}>
          EN
        </button>
      </div>
    </header>
  );
}
