import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { MailDetail } from "../types";
import { IconClose, IconEdit, IconFile } from "./Icons";
import { Sillage } from "./Sillage";
import { StatusChip } from "./StatusChip";
import { StatusModal } from "./StatusModal";
import { useToast } from "./Toast";

const fmtDate = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");
const fmtDT = (d: string) => new Date(d).toLocaleString("fr-FR");

function Meta({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="dm">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

export function DocumentDrawer({
  docId,
  register,
  onClose,
}: {
  docId: string;
  register: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: doc, refetch } = useQuery<MailDetail>({
    queryKey: ["doc", docId],
    queryFn: () => api.getDoc(docId),
  });
  const [edit, setEdit] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!doc)
    return (
      <>
        <div className="scrim" onClick={onClose} />
        <aside className="drawer">
          <div className="center-load"><span className="spin dark" /></div>
        </aside>
      </>
    );

  const record = doc;
  const isS = record.register === "S";

  function startEdit() {
    setForm({
      type_document: record.type_document,
      reference: record.reference || "",
      objet: record.objet || "",
      expediteur: record.expediteur || "",
      projet: record.projet || "",
      destinataire: record.destinataire || "",
      date_remise_destinataire: record.date_remise_destinataire || "",
    });
    setEdit(true);
  }

  async function save() {
    setBusy(true);
    try {
      const clean = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      await api.updateDoc(record.id, clean);
      toast(t("detail.saved"), "ok");
      setEdit(false);
      refetch();
      qc.invalidateQueries({ queryKey: ["list", register] });
    } catch {
      toast(t("toast.error"), "err");
    } finally {
      setBusy(false);
    }
  }

  async function viewPdf() {
    try {
      const blob = await api.viewPdf(record.id);
      window.open(URL.createObjectURL(blob), "_blank");
    } catch {
      toast(t("toast.error"), "err");
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">
        <div className={"drawer__head" + (isS ? " s" : "")}>
          <div className="ripple"><Sillage /></div>
          <button className="drawer__close" onClick={onClose}><IconClose width={18} height={18} /></button>
          <div className="drawer__kicker">{isS ? t("filters.sortie") : t("filters.entree")}</div>
          <h2 className="drawer__title">{doc.no_ordre}</h2>
        </div>

        <div className="drawer__body">
          {!edit ? (
            <>
              <div className="detail-meta">
                <Meta k={t("cols.type")} v={doc.type_document} />
                <Meta k={t("cols.date")} v={fmtDate(doc.date_enregistrement)} />
                <div style={{ gridColumn: "1 / -1" }}><Meta k={t("cols.objet")} v={doc.objet || "—"} /></div>
                <Meta k={t("saisie.reference")} v={doc.reference || "—"} />
                <Meta k={t("cols.statut")} v={<StatusChip value={doc.dernier_statut} />} />
                <Meta k={t("cols.expediteur")} v={doc.expediteur || "—"} />
                <Meta k={t("cols.projet")} v={doc.projet || "—"} />
                <Meta k={t("saisie.destinataire")} v={doc.destinataire || "—"} />
                <Meta k={t("saisie.dateRemise")} v={fmtDate(doc.date_remise_destinataire)} />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button className="btn" onClick={startEdit}><IconEdit width={16} height={16} /> {t("detail.edit")}</button>
                <button className="btn" onClick={() => setStatusModal(true)}>{t("detail.changeStatus")}</button>
                {doc.has_pdf ? (
                  <button className="btn" onClick={viewPdf}><IconFile width={16} height={16} /> {t("detail.viewPdf")}</button>
                ) : (
                  <span className="muted-link">{t("detail.noPdf")}</span>
                )}
              </div>

              <div className="detail-sec">{t("detail.history")}</div>
              <ul className="hist">
                {doc.history.map((h, i) => (
                  <li key={i}>
                    <div className="ht">
                      <StatusChip value={h.new_status} />
                      {h.old_status && <span style={{ color: "var(--wabag-gray)", fontSize: 12 }}>← {h.old_status}</span>}
                    </div>
                    <div className="hd">{fmtDT(h.changed_at)}{h.note ? ` · ${h.note}` : ""}</div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="form-grid">
              <div>
                <label className="form-label">{t("saisie.type")}</label>
                <select className="input" value={form.type_document} onChange={set("type_document")}>
                  <option>Facture</option><option>Lettre</option><option>Fax</option>
                  <option>Bon de Livraison</option><option>Dossier</option><option>Autre</option>
                </select>
              </div>
              <div>
                <label className="form-label">{t("saisie.reference")}</label>
                <input className="input" value={form.reference} onChange={set("reference")} />
              </div>
              <div className="full">
                <label className="form-label">{t("saisie.objet")}</label>
                <input className="input" value={form.objet} onChange={set("objet")} />
              </div>
              <div>
                <label className="form-label">{t("saisie.expediteur")}</label>
                <input className="input" value={form.expediteur} onChange={set("expediteur")} />
              </div>
              <div>
                <label className="form-label">{t("saisie.projet")}</label>
                <input className="input" value={form.projet} onChange={set("projet")} />
              </div>
              <div>
                <label className="form-label">{t("saisie.destinataire")}</label>
                <input className="input" value={form.destinataire} onChange={set("destinataire")} />
              </div>
              <div>
                <label className="form-label">{t("saisie.dateRemise")}</label>
                <input className="input" type="date" value={form.date_remise_destinataire} onChange={set("date_remise_destinataire")} />
              </div>
            </div>
          )}
        </div>

        {edit && (
          <div className="drawer__foot">
            <button className="btn-ghost" onClick={() => setEdit(false)}>{t("detail.cancel")}</button>
            <button className="btn-save" onClick={save} disabled={busy}>
              {busy ? <span className="spin" /> : t("detail.save")}
            </button>
          </div>
        )}

        {statusModal && (
          <StatusModal register={register} doc={doc} onClose={() => { setStatusModal(false); refetch(); }} />
        )}
      </aside>
    </>
  );
}
