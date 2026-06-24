import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { getOverdueDays } from "../lib/prefs";
import type { RegisterInsights } from "../types";
import { IconAlert, IconClock, IconFile, IconGauge } from "./Icons";

const fmtDate = (d: string) => d.split("-").reverse().join("/");

function statusColor(s: string): string {
  const v = (s || "").toLowerCase();
  if (v.includes("clos") || v.includes("livr")) return "var(--ok)";
  if (v.includes("attente")) return "var(--warn)";
  if (v.includes("annul")) return "var(--danger)";
  return "var(--info)";
}

export function SuiviPanel({
  register,
  onBucket,
  onOpenDoc,
}: {
  register: "entree" | "sortie";
  onBucket: (b: string) => void;
  onOpenDoc: (id: string) => void;
}) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const overdueDays = getOverdueDays();
  const { data, isLoading } = useQuery<RegisterInsights>({
    queryKey: ["insights", register, overdueDays],
    queryFn: () => api.insights(register, overdueDays, year),
  });

  if (isLoading || !data) return <div className="center-load"><span className="spin dark" /></div>;

  const maxStatus = Math.max(1, ...data.by_status.map((s) => s.count));
  const maxProjet = Math.max(1, ...data.by_projet.map((s) => s.count));

  return (
    <>
      <div className="alert-grid">
        <button className="alert info" onClick={() => onBucket("open")}>
          <div className="alert__ic"><IconClock width={18} height={18} /></div>
          <div className="alert__val">{data.open}</div>
          <div className="alert__label">{t("suivi.open")}</div>
        </button>
        <button className="alert danger" onClick={() => onBucket("overdue")}>
          <div className="alert__ic"><IconAlert width={18} height={18} /></div>
          <div className="alert__val">{data.overdue}</div>
          <div className="alert__label">{t("suivi.overdue")}</div>
        </button>
        <button className="alert warn" onClick={() => onBucket("no_pdf")}>
          <div className="alert__ic"><IconFile width={18} height={18} /></div>
          <div className="alert__val">{data.no_pdf_open}</div>
          <div className="alert__label">{t("suivi.noPdf")}</div>
        </button>
        <div className="alert ok flat">
          <div className="alert__ic"><IconGauge width={18} height={18} /></div>
          <div className="alert__val">
            {data.avg_processing_days ?? "—"}
            {data.avg_processing_days != null && <span style={{ fontSize: 14, color: "var(--wabag-gray)" }}> {t("suivi.days")}</span>}
          </div>
          <div className="alert__label">{t("suivi.avgProc")}</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card__title">
            {t("suivi.watch")}
            <small style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 11.5, color: "var(--wabag-gray)" }}>
              {t("suivi.watchHint")}
            </small>
          </div>
          {data.watch.length === 0 ? (
            <div style={{ color: "var(--ok)", fontSize: 13, padding: "14px 0", fontWeight: 500 }}>{t("suivi.noWatch")}</div>
          ) : (
            data.watch.map((w) => (
              <div className="watch-row" key={w.id} onClick={() => onOpenDoc(w.id)}>
                <span className={"stamp" + (register === "sortie" ? " s" : "")}>{w.no_ordre}</span>
                <div className="wo">
                  <b>{w.objet || "—"}</b>
                  <small>{fmtDate(w.date_enregistrement)} · {w.expediteur || "—"}</small>
                </div>
                <div className="flags">
                  <span className="flag age">{w.age_days} {t("suivi.days")}</span>
                  {w.overdue && <span className="flag late">{t("suivi.late")}</span>}
                  {!w.has_pdf && <span className="flag nopdf">{t("suivi.missingPdf")}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__title">{t("suivi.aging")}</div>
            <div className="aging-grid">
              {data.aging.map((a, i) => (
                <div className={"aging" + (i === 3 && a.count > 0 ? " hot" : "")} key={a.bucket}>
                  <div className="aging__val">{a.count}</div>
                  <div className="aging__lbl">{a.bucket}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card__title">{t("suivi.statusDist")}</div>
            {data.by_status.map((s) => (
              <div className="hbar-row" key={s.status}>
                <div className="lbl">{s.status || "—"}</div>
                <div className="hbar-track"><div className="hbar-fill" style={{ width: `${(s.count / maxStatus) * 100}%`, background: statusColor(s.status) }} /></div>
                <div className="num">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__title">{t("suivi.backlog")}</div>
        {data.by_projet.length === 0 ? (
          <div style={{ color: "var(--wabag-gray)", fontSize: 13 }}>—</div>
        ) : (
          data.by_projet.map((p) => (
            <div className="hbar-row" key={p.projet}>
              <div className="lbl">{p.projet}</div>
              <div className="hbar-track"><div className="hbar-fill" style={{ width: `${(p.count / maxProjet) * 100}%` }} /></div>
              <div className="num">{p.count}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
