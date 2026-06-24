import type { ReactNode } from "react";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  busy,
  confirmDisabled,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  busy?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="modal" style={{ zIndex: 70 }} onClick={onCancel}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">{title}</h3>
        <p className="modal__sub" style={{ marginBottom: children ? 14 : 0 }}>{message}</p>
        {children}
        <div className="modal__foot">
          <button className="btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={danger ? "btn-danger" : "btn-save"}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? <span className="spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
