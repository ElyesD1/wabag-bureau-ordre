import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { IconEdit, IconPlus, IconUsers } from "../components/Icons";
import { useToast } from "../components/Toast";
import { useAuth } from "../store/auth";
import type { UserAdmin } from "../types";

type ModalState = { mode: "new" | "edit" | "pwd"; u?: UserAdmin } | null;

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function Users() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState<ModalState>(null);
  const { data, isLoading, error } = useQuery<UserAdmin[]>({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
  });

  async function toggleActive(u: UserAdmin) {
    try {
      await api.users.update(u.id, { is_active: !u.is_active });
      toast(t("users.updated"), "ok");
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch {
      toast(t("toast.error"), "err");
    }
  }

  if (user?.role !== "admin")
    return <main className="content"><div className="empty">Accès réservé aux administrateurs.</div></main>;
  if (isLoading) return <main className="content"><div className="center-load"><span className="spin dark" /></div></main>;
  if (error || !data) return <main className="content"><div className="empty">{t("toast.error")}</div></main>;

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
                    <button className="muted-link" onClick={() => setModal({ mode: "pwd", u })}>{t("users.resetPassword")}</button>
                    {u.id !== user?.id && (
                      <button className="muted-link" onClick={() => toggleActive(u)}>
                        {u.is_active ? t("users.deactivate") : t("users.activate")}
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
    </main>
  );
}

function UserModal({ modal, onClose }: { modal: NonNullable<ModalState>; onClose: () => void }) {
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
      } else if (modal.mode === "edit") {
        await api.users.update(u!.id, { full_name: fullName, role });
        toast(t("users.updated"), "ok");
      } else {
        await api.users.resetPassword(u!.id, password);
        toast(t("users.passwordReset"), "ok");
      }
      qc.invalidateQueries({ queryKey: ["users"] });
      onClose();
    } catch {
      toast(t("toast.error"), "err");
    } finally {
      setBusy(false);
    }
  }

  const title =
    modal.mode === "new" ? t("users.newUser") : modal.mode === "edit" ? t("users.editUser") : t("users.resetPassword");

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">{title}</h3>
        <div style={{ height: 16 }} />
        {modal.mode !== "pwd" && (
          <>
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
          </>
        )}
        {(modal.mode === "new" || modal.mode === "pwd") && (
          <>
            <div style={{ height: 12 }} />
            <label className="form-label">{modal.mode === "pwd" ? t("users.newPassword") : t("users.password")}</label>
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
