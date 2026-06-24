import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { api } from "../api/client";
import { IconClose, IconUpload } from "./Icons";
import { Sillage } from "./Sillage";
import { useToast } from "./Toast";

const schema = z.object({
  type_document: z.string().min(1),
  reference: z.string().optional(),
  objet: z.string().min(1),
  expediteur: z.string().optional(),
  projet: z.string().optional(),
  destinataire: z.string().optional(),
  date_remise_destinataire: z.string().optional(),
  dernier_statut: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function SaisieDrawer({
  register,
  onClose,
}: {
  register: "entree" | "sortie";
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const {
    register: rhf,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type_document: "Facture", dernier_statut: "En cours" },
  });

  const stampPrefix = register === "entree" ? "BOE" : "BOS";
  const year = new Date().getFullYear();

  async function onSubmit(data: FormData) {
    try {
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined && v !== ""),
      );
      const rec = await api.create(register, clean);
      if (file) await api.uploadPdf(rec.id, file);
      toast(t("toast.created", { no: rec.no_ordre }), "ok");
      qc.invalidateQueries({ queryKey: ["list", register] });
      qc.invalidateQueries({ queryKey: ["count", register] });
      onClose();
    } catch {
      toast(t("toast.error"), "err");
    }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" aria-label={t("saisie.title")}>
        <div className={"drawer__head" + (register === "sortie" ? " s" : "")}>
          <div className="ripple">
            <Sillage />
          </div>
          <button className="drawer__close" onClick={onClose}>
            <IconClose width={18} height={18} />
          </button>
          <div className="drawer__kicker">
            {t("saisie.kicker", { reg: register === "entree" ? t("filters.entree") : t("filters.sortie") })}
          </div>
          <h2 className="drawer__title">{t("saisie.title")}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "contents" }}>
          <div className="drawer__body">
            <div className="auto-row">
              <div className="auto-card">
                <div className="lbl">{t("saisie.autoNo")}</div>
                <div className="val">{stampPrefix}{year}····</div>
              </div>
              <div className="auto-card">
                <div className="lbl">{t("saisie.autoDate")}</div>
                <div className="val date">{new Date().toLocaleDateString("fr-FR")}</div>
              </div>
            </div>

            <div className="form-grid">
              <div>
                <label className="form-label">{t("saisie.type")} <span className="req">*</span></label>
                <select className="input" {...rhf("type_document")}>
                  <option>Facture</option>
                  <option>Lettre</option>
                  <option>Fax</option>
                  <option>Bon de Livraison</option>
                  <option>Dossier</option>
                  <option>Autre</option>
                </select>
              </div>
              <div>
                <label className="form-label">{t("saisie.reference")}</label>
                <input className="input" {...rhf("reference")} placeholder="FAC-2026-0462" />
              </div>
              <div className="full">
                <label className="form-label">{t("saisie.objet")} <span className="req">*</span></label>
                <input
                  className={"input" + (errors.objet ? " err" : "")}
                  {...rhf("objet")}
                  placeholder={t("saisie.objetPh")}
                />
                {errors.objet && <div className="field-err">{t("saisie.required")}</div>}
              </div>
              <div>
                <label className="form-label">{t("saisie.expediteur")}</label>
                <input className="input" {...rhf("expediteur")} placeholder="ONAS" />
              </div>
              <div>
                <label className="form-label">{t("saisie.projet")}</label>
                <input className="input" {...rhf("projet")} placeholder="STEP Sud Méliane" />
              </div>
              <div>
                <label className="form-label">{t("saisie.destinataire")}</label>
                <input className="input" {...rhf("destinataire")} />
              </div>
              <div>
                <label className="form-label">{t("saisie.dateRemise")}</label>
                <input className="input" type="date" {...rhf("date_remise_destinataire")} />
              </div>
              <div className="full">
                <label className="form-label">{t("saisie.statutInitial")}</label>
                <select className="input" {...rhf("dernier_statut")}>
                  <option>En cours</option>
                  <option>En attente</option>
                  <option>Clos</option>
                </select>
              </div>

              <div
                className={"dropzone" + (file ? " has-file" : "")}
                onClick={() => fileRef.current?.click()}
              >
                <IconUpload width={26} height={26} />
                <div style={{ marginTop: 8 }}>
                  <b>{file ? file.name : t("saisie.pdf")}</b>
                </div>
                <div className="hint">{t("saisie.pdfHint")}</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>

          <div className="drawer__foot">
            <button type="button" className="btn-ghost" onClick={onClose}>
              {t("saisie.cancel")}
            </button>
            <button type="submit" className="btn-save" disabled={isSubmitting}>
              {isSubmitting ? <span className="spin" /> : t("saisie.save")}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
