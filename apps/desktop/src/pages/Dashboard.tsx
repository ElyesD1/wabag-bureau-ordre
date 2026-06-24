import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { IconGrid } from "../components/Icons";
import { Sillage } from "../components/Sillage";
import { StatusChip } from "../components/StatusChip";
import type { DashboardStats } from "../types";

const fmtDate = (d: string) => d.split("-").reverse().join("/");

function statusColor(s: string): string {
  const v = s.toLowerCase();
  if (v.includes("clos") || v.includes("livr")) return "var(--ok)";
  if (v.includes("attente")) return "var(--warn)";
  if (v.includes("annul")) return "var(--danger)";
  if (v === "—") return "var(--wabag-gray)";
  return "var(--info)";
}

export function Dashboard() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["stats", year],
    queryFn: () => api.stats(year),
  });
  const months = t("dashboard.months", { returnObjects: true }) as unknown as string[];

  if (isLoading || !data)
    return (
      <main className="content">
        <div className="center-load"><span className="spin dark" /></div>
      </main>
    );

  const maxMonth = Math.max(1, ...data.by_month.map((m) => m.entree + m.sortie));
  const maxStatus = Math.max(1, ...data.by_status.map((s) => s.count));
  const maxType = Math.max(1, ...data.by_type.map((s) => s.count));

  return (
    <main className="content">
      <div className="page-head">
        <div className="page-head__icon"><IconGrid width={24} height={24} /></div>
        <div>
          <h1 className="page-title">{t("dashboard.title")}</h1>
          <p className="page-sub">{t("dashboard.subtitle", { year })}</p>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi kpi--e">
          <div className="kpi__rip"><Sillage stroke="#075095" /></div>
          <div className="kpi__label">{t("dashboard.totalEntree")}</div>
          <div className="kpi__val">{data.totals.entree}</div>
        </div>
        <div className="kpi kpi--s">
          <div className="kpi__rip"><Sillage stroke="#0F7B8A" /></div>
          <div className="kpi__label">{t("dashboard.totalSortie")}</div>
          <div className="kpi__val">{data.totals.sortie}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">{t("dashboard.pending")}</div>
          <div className="kpi__val" style={{ color: "var(--warn)" }}>{data.pending}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">{t("dashboard.total", { year })}</div>
          <div className="kpi__val" style={{ color: "var(--wabag-ink)" }}>{data.totals.total}</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card__title">
            {t("dashboard.monthly")}
            <span className="legend">
              <span><i style={{ background: "var(--wabag-blue)" }} />{t("filters.entree")}</span>
              <span><i style={{ background: "var(--teal)" }} />{t("filters.sortie")}</span>
            </span>
          </div>
          <div className="barchart">
            {data.by_month.map((m, i) => (
              <div className="bar-col" key={i}>
                <div className="bar-stack">
                  <div className="bar e" style={{ height: `${(m.entree / maxMonth) * 100}%` }} title={`${m.entree}`} />
                  <div className="bar s" style={{ height: `${(m.sortie / maxMonth) * 100}%` }} title={`${m.sortie}`} />
                </div>
                <div className="bar-col__label">{months[i]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__title">{t("dashboard.recent")}</div>
          <div className="recent-list">
            {data.recent.map((r) => (
              <div className="recent-row" key={r.id}>
                <span className={"stamp" + (r.register === "S" ? " s" : "")}>{r.no_ordre}</span>
                <div className="ro">
                  <b>{r.objet || "—"}</b>
                  <small>{fmtDate(r.date_enregistrement)} · {r.expediteur || "—"}</small>
                </div>
                <StatusChip value={r.dernier_statut} />
              </div>
            ))}
            {data.recent.length === 0 && (
              <div style={{ color: "var(--wabag-gray)", fontSize: 13, padding: "10px 0" }}>{t("dashboard.noData")}</div>
            )}
          </div>
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card__title">{t("dashboard.byType")}</div>
          {data.by_type.map((b) => (
            <div className="hbar-row" key={b.type}>
              <div className="lbl">{b.type}</div>
              <div className="hbar-track"><div className="hbar-fill" style={{ width: `${(b.count / maxType) * 100}%` }} /></div>
              <div className="num">{b.count}</div>
            </div>
          ))}
          {data.by_type.length === 0 && <div style={{ color: "var(--wabag-gray)", fontSize: 13 }}>{t("dashboard.noData")}</div>}
        </div>
        <div className="card">
          <div className="card__title">{t("dashboard.byStatus")}</div>
          {data.by_status.map((b) => (
            <div className="hbar-row" key={b.status}>
              <div className="lbl">{b.status}</div>
              <div className="hbar-track">
                <div className="hbar-fill" style={{ width: `${(b.count / maxStatus) * 100}%`, background: statusColor(b.status) }} />
              </div>
              <div className="num">{b.count}</div>
            </div>
          ))}
          {data.by_status.length === 0 && <div style={{ color: "var(--wabag-gray)", fontSize: 13 }}>{t("dashboard.noData")}</div>}
        </div>
      </div>
    </main>
  );
}
