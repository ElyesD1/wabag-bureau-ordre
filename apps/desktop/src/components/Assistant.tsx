import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { FAQ_GROUPS, type FaqItem } from "../assistant/kb";
import i18n from "../i18n";
import { IconClose } from "./Icons";

export function Assistant() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const lang = i18n.language.startsWith("en") ? "en" : "fr";

  function toggle(it: FaqItem) {
    const next = openId === it.id ? null : it.id;
    setOpenId(next);
    if (next) {
      // Record which question was opened (lightweight in-app analytics).
      api.assistant
        .log(lang === "en" ? it.q.en : it.q.fr, lang === "en" ? it.en : it.fr, it.id)
        .catch(() => {});
    }
  }

  function goTo(route: string) {
    nav(route);
    setOpen(false);
  }

  return (
    <>
      {!open && (
        <button className="asst-fab" onClick={() => setOpen(true)} aria-label={t("assistant.fab")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />
            <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
          </svg>
          {t("assistant.fab")}
        </button>
      )}

      {open && (
        <div className="asst-panel">
          <div className="asst-head">
            <div className="asst-head__ic">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />
              </svg>
            </div>
            <div className="asst-head__txt">
              <b>{t("assistant.title")}</b>
              <small>{t("assistant.subtitle")}</small>
            </div>
            <button className="asst-x" onClick={() => setOpen(false)} aria-label={t("common.close")}>
              <IconClose width={16} height={16} />
            </button>
          </div>

          <div className="asst-faq">
            <p className="asst-faq__intro">{t("assistant.pick")}</p>
            {FAQ_GROUPS.map((g) => (
              <div className="asst-grp" key={g.id}>
                <div className="asst-grp__label">{lang === "en" ? g.en : g.fr}</div>
                {g.items.map((it) => {
                  const isOpen = openId === it.id;
                  return (
                    <div className={"asst-item" + (isOpen ? " open" : "")} key={it.id}>
                      <button className="asst-q" onClick={() => toggle(it)} aria-expanded={isOpen}>
                        <span>{lang === "en" ? it.q.en : it.q.fr}</span>
                        <svg className="asst-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="asst-a">
                          {lang === "en" ? it.en : it.fr}
                          {it.route && (
                            <button className="asst-go" onClick={() => goTo(it.route!)}>
                              {t("assistant.go")} →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
