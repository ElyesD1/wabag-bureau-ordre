import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, api } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IconEdit, IconKey, IconPlus, IconTrash, IconUsers } from "../components/Icons";
import { useToast } from "../components/Toast";
import { useAuth } from "../store/auth";
import type { UserAdmin } from "../types";

type EditModal = { mode: "new" | "edit"; u?: UserAdmin } | null;
type Action = { kind: "delete" | "deactivate" | "reset"; u: UserAdmin } | null;

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function Users() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState<EditModal>(null);
  const [action, setAction] = useState<Action>(null);
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, isLoading, error } = useQuery<UserAdmin[]>({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
  });

  async function runAction() {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === "delete") {
        await api.users.remove(action.u.id);
        toast(t("users.deleted"), "ok");
      } else if (action.kind === "deactivate") {
        await api.users.update(action.u.id, { is_active: !action.u.is_active });
        toast(t("users.updated"), "ok");
      } else {
        await api.users.resetPassword(action.u.id, pwd);
        toast(t("users.passwordReset"), "ok");
      }
      qc.invalidateQueries({ queryKey: ["users"] });
      setAction(null);
      setPwd("");
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 409 ? e.message : t("toast.error");
      toast(msg, "err");
    } finally {
      setBusy(false);
    }
  }

  if (user?.role !== "admin")
    return <main className="content"><div className="empty">Accès réservé aux administrateurs.</div></main>;
  if (isLoading) return <main className="content"><div className="center-load"><span className="spin dark" /></div></main>;
  if (error || !data) return <main className="content"><div className="empty">{t("toast.error")}</div></main>;

  const actionTitle =
    action?.kind === "delete"
      ? t("users.deleteTitle")
      : action?.kind === "reset"
        ? t("users.resetPassword")
        : action?.u.is_active
          ? t("users.deactivate")
          : t("users.activate");
  const actionMsg =
    action?.kind === "delete"
      ? t("users.deleteMsg", { name: action.u.full_name })
      : action?.kind === "reset"
        ? t("users.resetMsg", { name: action.u.full_name })
        : action?.u.is_active
          ? t("users.deactivateMsg", { name: action.u.full_name })
          : t("users.activateMsg", { name: action?.u.full_name });

  return (
    <main className="content">
      <div className="page-head">
        <div className="page-head__icon"><IconUsers width={24} height={24} /></div>
        <div>
          <h1 className="page-title">{t("users.title")}</h1>
          <p className="page-sub"><b>{data.length}</b> · {t("users.subtitle")}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn--accent" onClick={() => setModal({ mode: "new" })}>
            <IconPlus width={17} height={17} /> {t("users.add")}
          </button>
        </div>
      </div>

      <div className="panel">
        <table className="utable">
          <thead>
            <tr>
              <th>{t("users.fullName")}</th>
              <th>{t("users.username")}</th>
              <th>{t("users.role")}</th>
              <th>{t("users.status")}</th>
              <th>{t("users.lastLogin")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td><div className="uname"><span className="av">{initials(u.full_name)}</span>{u.full_name}</div></td>
                <td className="mono-row">{u.username}</td>
                <td><span className={"badge " + (u.role === "admin" ? "admin" : "clerk")}>{u.role === "admin" ? t("users.admin") : t("users.clerk")}</span></td>
                <td><span className={"badge " + (u.is_active ? "on" : "off")}>{u.is_active ? t("users.active") : t("users.inactive")}</span></td>
                <td className="mono-row">{u.last_login_at ? u.last_login_at.slice(0, 10) : t("users.never")}</td>
                <td>
                  <div className="uactions">
                    <button className="rowbtn" title={t("users.editUser")} onClick={() => setModal({ mode: "edit", u })}>
                      <IconEdit width={16} height={16} />
                    </button>
                    <button className="rowbtn" title={t("users.resetPassword")} onClick={() => { setPwd(""); setAction({ kind: "reset", u }); }}>
                      <IconKey width={16} height={16} />
                    </button>
                    {u.id !== user?.id && (
                      <button className="muted-link" onClick={() => setAction({ kind: "deactivate", u })}>
                        {u.is_active ? t("users.deactivate") : t("users.activate")}
                      </button>
                    )}
                    {u.id !== user?.id && (
                      <button className="rowbtn danger" title={t("users.delete")} onClick={() => setAction({ kind: "delete", u })}>
                        <IconTrash width={16} height={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <UserModal modal={modal} onClose={() => setModal(null)} />}

      {action && (
        <ConfirmDialog
          title={actionTitle}
          message={actionMsg}
          confirmLabel={action.kind === "delete" ? t("users.delete") : t("users.confirm")}
          cancelLabel={t("users.cancel")}
          danger={action.kind === "delete"}
          busy={busy}
          confirmDisabled={action.kind === "reset" && pwd.length < 6}
          onCancel={() => { setAction(null); setPwd(""); }}
          onConfirm={runAction}
        >
          {action.kind === "reset" && (
            <>
              <label className="form-label">{t("users.newPassword")}</label>
              <input className="input" type="password" value={pwd} autoFocus onChange={(e) => setPwd(e.target.value)} />
            </>
          )}
        </ConfirmDialog>
      )}
    </main>
  );
}

function UserModal({ modal, onClose }: { modal: NonNullable<EditModal>; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const u = modal.u;
  const [fullName, setFullName] = useState(u?.full_name || "");
  const [username, setUsername] = useState(u?.username || "");
  const [role, setRole] = useState(u?.role || "clerk");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      if (modal.mode === "new") {
        await api.users.create({ username, full_name: fullName, role, password });
        toast(t("users.created"), "ok");
      } else {
        await api.users.update(u!.id, { full_name: fullName, role });
        toast(t("users.updated"), "ok");
      }
      qc.invalidateQueries({ queryKey: ["users"] });
      onClose();
    } catch {
      toast(t("toast.error"), "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">{modal.mode === "new" ? t("users.newUser") : t("users.editUser")}</h3>
        <div style={{ height: 16 }} />
        <label className="form-label">{t("users.fullName")}</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <div style={{ height: 12 }} />
        {modal.mode === "new" && (
          <>
            <label className="form-label">{t("users.username")}</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
            <div style={{ height: 12 }} />
          </>
        )}
        <label className="form-label">{t("users.role")}</label>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="clerk">{t("users.clerk")}</option>
          <option value="admin">{t("users.admin")}</option>
        </select>
        {modal.mode === "new" && (
          <>
            <div style={{ height: 12 }} />
            <label className="form-label">{t("users.password")}</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </>
        )}
        <div className="modal__foot">
          <button className="btn-ghost" onClick={onClose}>{t("users.cancel")}</button>
          <button className="btn-save" onClick={save} disabled={busy}>
            {busy ? <span className="spin" /> : t("users.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
