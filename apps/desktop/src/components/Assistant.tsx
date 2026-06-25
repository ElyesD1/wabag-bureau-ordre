import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { GREETING, SUGGESTIONS, type Intent } from "../assistant/kb";
import { match } from "../assistant/match";
import i18n from "../i18n";
import { IconClose } from "./Icons";

interface Msg {
  role: "user" | "bot";
  text: string;
  route?: string;
}

export function Assistant() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const lang = i18n.language.startsWith("en") ? "en" : "fr";

  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    api.assistant
      .history()
      .then((h: { role: "user" | "bot"; text: string }[]) =>
        setMessages(h.map((m) => ({ role: m.role, text: m.text }))),
      )
      .catch(() => {});
  }, [open, loaded]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function respond(userText: string, intent: Intent) {
    const answer = lang === "en" ? intent.en : intent.fr;
    setMessages((m) => [...m, { role: "user", text: userText }, { role: "bot", text: answer, route: intent.route }]);
    api.assistant.log(userText, answer, intent.id).catch(() => {});
  }

  function send() {
    const v = input.trim();
    if (!v) return;
    respond(v, match(v));
    setInput("");
  }

  function pick(it: Intent) {
    respond(lang === "en" ? it.chip!.en : it.chip!.fr, it);
  }

  function goTo(route: string) {
    nav(route);
    setOpen(false);
  }

  const showStart = messages.length === 0;

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
            <button className="asst-x" onClick={() => setOpen(false)} aria-label="Fermer">
              <IconClose width={16} height={16} />
            </button>
          </div>

          <div className="asst-body">
            {showStart && <div className="asst-msg bot">{GREETING[lang]}</div>}
            {messages.map((m, i) => (
              <div key={i} className={"asst-msg " + m.role}>
                {m.text}
                {m.role === "bot" && m.route && (
                  <button className="asst-go" onClick={() => goTo(m.route!)}>
                    {t("assistant.go")} →
                  </button>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {showStart && (
            <div className="asst-chips">
              {SUGGESTIONS.map((s) => (
                <button key={s.id} onClick={() => pick(s)}>
                  {lang === "en" ? s.chip!.en : s.chip!.fr}
                </button>
              ))}
            </div>
          )}

          <div className="asst-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("assistant.placeholder")}
            />
            <button onClick={send} disabled={!input.trim()} aria-label={t("assistant.send")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
