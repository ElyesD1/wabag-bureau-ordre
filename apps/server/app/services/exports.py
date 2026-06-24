from io import BytesIO
from typing import Sequence

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from app.models.mail import MailRecord

HEADERS = {
    "fr": [
        "N° d'ordre", "Date", "Type", "Référence", "Objet",
        "Expéditeur", "Projet", "Destinataire", "Date remise", "Statut",
    ],
    "en": [
        "Order No.", "Date", "Type", "Reference", "Subject",
        "Sender", "Project", "Recipient", "Delivery date", "Status",
    ],
}
FIELDS = [
    "no_ordre", "date_enregistrement", "type_document", "reference", "objet",
    "expediteur", "projet", "destinataire", "date_remise_destinataire", "dernier_statut",
]
WIDTHS = [15, 12, 16, 16, 42, 22, 22, 22, 14, 12]


def build_journal_xlsx(records: Sequence[MailRecord], lang: str = "fr") -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Journal"

    ws.append(HEADERS.get(lang, HEADERS["fr"]))
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="075095")  # WABAG blue
        cell.alignment = Alignment(vertical="center")

    for r in records:
        ws.append([getattr(r, f) for f in FIELDS])

    for i, w in enumerate(WIDTHS, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"

    bio = BytesIO()
    wb.save(bio)
    return bio.getvalue()


AUDIT_HEADERS = ["Date / heure", "Utilisateur", "Action", "Entité", "Cible", "IP"]
AUDIT_WIDTHS = [20, 26, 22, 16, 40, 16]


def build_audit_xlsx(rows) -> bytes:
    """rows: iterable of (AuditLog, username, full_name) tuples."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Journal d'activité"

    ws.append(AUDIT_HEADERS)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="075095")
        cell.alignment = Alignment(vertical="center")

    for entry, username, full_name in rows:
        ws.append([
            entry.at.strftime("%d/%m/%Y %H:%M:%S") if entry.at else "",
            full_name or username or "—",
            entry.action,
            entry.entity or "",
            entry.entity_id or "",
            str(entry.ip) if entry.ip else "",
        ])

    for i, w in enumerate(AUDIT_WIDTHS, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"

    bio = BytesIO()
    wb.save(bio)
    return bio.getvalue()
