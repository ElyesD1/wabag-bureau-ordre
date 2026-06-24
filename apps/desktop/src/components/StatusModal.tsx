import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { MailRecord } from "../types";
import { useToast } from "./Toast";

export function StatusModal({
  register,
  doc,
  onClose,
}: {
  register: string;
  doc: MailRecord;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState(doc.dernier_statut || "En cours");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.updateStatus(doc.id, { new_status: status, note: note || undefined });
      toast(t("toast.statusUpdated"), "ok");
      qc.invalidateQueries({ queryKey: ["list", register] });
      onClose();
    } catch {
      toast(t("toast.error"), "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">{t("modal.statusTitle")}</h3>
        <p className="modal__sub">{t("modal.statusSub", { no: doc.no_ordre })}</p>
        <label className="form-label">{t("modal.newStatus")}</label>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>En cours</option>
          <option>En attente</option>
          <option>Clos</option>
          <option>Annulé</option>
        </select>
        <div style={{ height: 12 }} />
        <label className="form-label">{t("modal.note")}</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="modal__foot">
          <button className="btn-ghost" onClick={onClose}>
            {t("modal.cancel")}
          </button>
          <button className="btn-save" onClick={save} disabled={busy}>
            {busy ? <span className="spin" /> : t("modal.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
