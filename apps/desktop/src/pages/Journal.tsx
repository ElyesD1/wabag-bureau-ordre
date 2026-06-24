import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { IconDownload, IconEdit, IconIn, IconOut, IconPlus } from "../components/Icons";
import { DocumentDrawer } from "../components/DocumentDrawer";
import { SaisieDrawer } from "../components/SaisieDrawer";
import { Sillage } from "../components/Sillage";
import { StatusChip } from "../components/StatusChip";
import { useToast } from "../components/Toast";
import type { PageResult } from "../types";

const PAGE_SIZE = 12;
const fmtDate = (d: string) => d.split("-").reverse().join("/");

export function Journal() {
  const { t } = useTranslation();
  const toast = useToast();
  const nav = useNavigate();
  const { register } = useParams();
  const reg: "entree" | "sortie" = register === "sortie" ? "sortie" : "entree";

  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") || "";
  const page = parseInt(sp.get("page") || "1", 10);
  const typeF = sp.get("type") || "";
  const statutF = sp.get("statut") || "";

  const [drawer, setDrawer] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery<PageResult>({
    queryKey: ["list", reg, { q, page, typeF, statutF }],
    queryFn: () =>
      api.list(reg, {
        q,
        page,
        page_size: PAGE_SIZE,
        type_document: typeF || undefined,
        statut: statutF || undefined,
      }),
  });

  function setParam(k: string, v: string) {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== "page") n.delete("page");
    setSp(n, { replace: true });
  }

  async function exportXlsx() {
    setExporting(true);
    try {
      const blob = await api.exportXlsx(reg, {
        q: q || undefined,
        type_document: typeF || undefined,
        statut: statutF || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal_${reg}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast(t("toast.exported"), "ok");
    } catch {
      toast(t("toast.error"), "err");
    } finally {
      setExporting(false);
    }
  }

  const items = data?.items || [];
  const total = data?.total || 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const year = new Date().getFullYear();
  const isS = reg === "sortie";

  return (
    <main className="content">
      <div className="page-head">
        <div className={"page-head__icon" + (isS ? " s" : "")}>
          {isS ? <IconOut width={24} height={24} /> : <IconIn width={24} height={24} />}
        </div>
        <div>
          <h1 className="page-title">{isS ? t("journal.titleS") : t("journal.titleE")}</h1>
          <p className="page-sub">
            <b>{total}</b> {t("journal.registered", { year })}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={exportXlsx} disabled={exporting}>
            <IconDownload width={17} height={17} /> {t("journal.export")}
          </button>
          <button className="btn btn--accent" onClick={() => setDrawer(true)}>
            <IconPlus width={17} height={17} /> {t("journal.new")}
          </button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi kpi--e">
          <div className="kpi__rip"><Sillage stroke="#075095" /></div>
          <div className="kpi__label">{t("filters.entree")} · {year}</div>
          <div className="kpi__val">{isS ? "—" : total}</div>
          <div className="kpi__delta">{t("cols.no")}</div>
        </div>
        <div className="kpi kpi--s">
          <div className="kpi__rip"><Sillage stroke="#0F7B8A" /></div>
          <div className="kpi__label">{t("filters.sortie")} · {year}</div>
          <div className="kpi__val">{isS ? total : "—"}</div>
          <div className="kpi__delta">{t("cols.no")}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">{t("status.enattente")}</div>
          <div className="kpi__val" style={{ color: "var(--warn)" }}>
            {items.filter((i) => (i.dernier_statut || "").toLowerCase().includes("attente")).length}
          </div>
          <div className="kpi__delta">{t("cols.statut")}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">{t("status.clos")}</div>
          <div className="kpi__val" style={{ color: "var(--ok)" }}>
            {items.filter((i) => (i.dernier_statut || "").toLowerCase().includes("clos")).length}
          </div>
          <div className="kpi__delta">{t("cols.statut")}</div>
        </div>
      </div>

      <div className="filters">
        <div className="chip-tab">
          <button className={"e" + (!isS ? " active" : "")} onClick={() => nav("/entree")}>
            <IconIn width={15} height={15} /> {t("filters.entree")}
          </button>
          <button className={"s" + (isS ? " active" : "")} onClick={() => nav("/sortie")}>
            <IconOut width={15} height={15} /> {t("filters.sortie")}
          </button>
        </div>
        <select className="select" value={typeF} onChange={(e) => setParam("type", e.target.value)}>
          <option value="">{t("filters.type")}</option>
          <option>Facture</option>
          <option>Lettre</option>
          <option>Fax</option>
          <option>Bon de Livraison</option>
          <option>Dossier</option>
        </select>
        <select className="select" value={statutF} onChange={(e) => setParam("statut", e.target.value)}>
          <option value="">{t("filters.statut")}</option>
          <option>En cours</option>
          <option>En attente</option>
          <option>Clos</option>
          <option>Annulé</option>
        </select>
        <span className="spacer" />
        <button className="muted-link" onClick={() => setSp(new URLSearchParams(), { replace: true })}>
          {t("filters.reset")}
        </button>
      </div>

      <div className="panel">
        {isLoading ? (
          <div className="center-load"><span className="spin dark" /></div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div className="empty__rip"><Sillage stroke="#075095" /></div>
            <div style={{ fontWeight: 600, color: "var(--wabag-ink)" }}>{t("journal.empty")}</div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>{t("journal.emptyHint")}</div>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>{t("cols.no")}</th>
                  <th>{t("cols.date")}</th>
                  <th>{t("cols.type")}</th>
                  <th>{t("cols.objet")}</th>
                  <th>{t("cols.expediteur")}</th>
                  <th>{t("cols.projet")}</th>
                  <th>{t("cols.statut")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td><span className={"stamp" + (isS ? " s" : "")}>{r.no_ordre}</span></td>
                    <td className="cell-date">{fmtDate(r.date_enregistrement)}</td>
                    <td><span className="tagdoc">{r.type_document}</span></td>
                    <td className="cell-objet">
                      {r.objet || "—"}
                      {r.reference && <small>réf. {r.reference}</small>}
                    </td>
                    <td>{r.expediteur || "—"}</td>
                    <td>{r.projet || "—"}</td>
                    <td><StatusChip value={r.dernier_statut} /></td>
                    <td>
                      <button className="rowbtn" title={t("detail.edit")} onClick={() => setDetailId(r.id)}>
                        <IconEdit width={16} height={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-foot">
              <div className="info">{t("journal.showing", { from, to, total })}</div>
              <div className="pager">
                <button disabled={page <= 1} onClick={() => setParam("page", String(page - 1))}>‹</button>
                {Array.from({ length: pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} style={{ display: "inline-flex", gap: 6 }}>
                      {idx > 0 && p - arr[idx - 1] > 1 && <button disabled>…</button>}
                      <button className={p === page ? "active" : ""} onClick={() => setParam("page", String(p))}>
                        {p}
                      </button>
                    </span>
                  ))}
                <button disabled={page >= pages} onClick={() => setParam("page", String(page + 1))}>›</button>
              </div>
            </div>
          </>
        )}
      </div>

      {drawer && <SaisieDrawer register={reg} onClose={() => setDrawer(false)} />}
      {detailId && <DocumentDrawer docId={detailId} register={reg} onClose={() => setDetailId(null)} />}
    </main>
  );
}
