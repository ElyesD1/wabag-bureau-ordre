import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { IconActivity, IconDownload } from "../components/Icons";
import { useToast } from "../components/Toast";
import { useAuth } from "../store/auth";
import type { AuditPage, UserAdmin } from "../types";

const PAGE_SIZE = 30;
const fmtDT = (s: string) => new Date(s).toLocaleString("fr-FR");
const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function actionBadge(action: string): string {
  if (["create_record", "create_user"].includes(action)) return "green";
  if (["update_status", "update_user", "edit_document", "login"].includes(action)) return "blue";
  if (["reset_password", "self_password_change"].includes(action)) return "amber";
  if (action === "delete_user") return "red";
  return "gray";
}

function shortTarget(id: string | null): string {
  if (!id) return "—";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id) ? id.slice(0, 8) + "…" : id;
}

export function Audit() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const isAdmin = user?.role === "admin";

  const params = {
    action: action || undefined,
    actor_id: actorId || undefined,
    date_from: from || undefined,
    date_to: to || undefined,
  };

  const { data, isLoading } = useQuery<AuditPage>({
    queryKey: ["audit", { action, actorId, from, to, page }],
    queryFn: () => api.audit.list({ ...params, page, page_size: PAGE_SIZE }),
    enabled: isAdmin,
  });
  const { data: actions } = useQuery<string[]>({
    queryKey: ["audit-actions"],
    queryFn: () => api.audit.actions(),
    enabled: isAdmin,
  });
  const { data: users } = useQuery<UserAdmin[]>({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
    enabled: isAdmin,
  });

  function resetFilters() {
    setAction("");
    setActorId("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  async function exportXlsx() {
    setExporting(true);
    try {
      const blob = await api.audit.exportXlsx(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "journal_activite.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast(t("toast.exported"), "ok");
    } catch {
      toast(t("toast.error"), "err");
    } finally {
      setExporting(false);
    }
  }

  if (!isAdmin) return <main className="content"><div className="empty">Accès réservé aux administrateurs.</div></main>;

  const items = data?.items || [];
  const total = data?.total || 0;
  const fromN = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toN = Math.min(page * PAGE_SIZE, total);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(action || actorId || from || to);

  return (
    <main className="content">
      <div className="page-head">
        <div className="page-head__icon"><IconActivity width={24} height={24} /></div>
        <div>
          <h1 className="page-title">{t("audit.title")}</h1>
          <p className="page-sub"><b>{total}</b> · {t("audit.subtitle")}</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={exportXlsx} disabled={exporting}>
            <IconDownload width={17} height={17} /> {t("audit.export")}
          </button>
        </div>
      </div>

      <div className="filters">
        <select className="select" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">{t("audit.filterAction")}</option>
          {actions?.map((a) => <option key={a} value={a}>{t(`audit.actions.${a}`, { defaultValue: a })}</option>)}
        </select>
        <select className="select" value={actorId} onChange={(e) => { setActorId(e.target.value); setPage(1); }}>
          <option value="">{t("audit.filterUser")}</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <label style={{ fontSize: 12.5, color: "var(--wabag-gray)" }}>{t("audit.from")}</label>
        <input className="select" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <label style={{ fontSize: 12.5, color: "var(--wabag-gray)" }}>{t("audit.to")}</label>
        <input className="select" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        <span className="spacer" />
        <button className="muted-link" onClick={resetFilters} disabled={!hasFilters} style={hasFilters ? undefined : { opacity: 0.4, cursor: "default" }}>
          {t("audit.reset")}
        </button>
      </div>

      <div className="panel">
        {isLoading ? (
          <div className="center-load"><span className="spin dark" /></div>
        ) : items.length === 0 ? (
          <div className="empty">{t("audit.empty")}</div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>{t("audit.colWhen")}</th>
                  <th>{t("audit.colWho")}</th>
                  <th>{t("audit.colAction")}</th>
                  <th>{t("audit.colTarget")}</th>
                  <th>{t("audit.colIp")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id}>
                    <td className="cell-date">{fmtDT(e.at)}</td>
                    <td>
                      {e.actor_full_name ? (
                        <div className="uname">
                          <span className="av" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(e.actor_full_name)}</span>
                          {e.actor_full_name}
                        </div>
                      ) : (
                        <span style={{ color: "var(--wabag-gray)" }}>{t("audit.system")}</span>
                      )}
                    </td>
                    <td><span className={"badge " + actionBadge(e.action)}>{t(`audit.actions.${e.action}`, { defaultValue: e.action })}</span></td>
                    <td className="mono-row">
                      {e.entity && <small style={{ color: "var(--wabag-gray)" }}>{e.entity} </small>}
                      {shortTarget(e.entity_id)}
                    </td>
                    <td className="mono-row">{e.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-foot">
              <div className="info">{t("audit.showing", { from: fromN, to: toN, total })}</div>
              <div className="pager">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
                <button className="active">{page}</button>
                <button disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
