export type Register = "entree" | "sortie";

export interface MailRecord {
  id: string;
  register: string; // "E" | "S"
  no_ordre: string;
  date_enregistrement: string;
  type_document: string;
  reference: string | null;
  objet: string | null;
  expediteur: string | null;
  projet: string | null;
  destinataire: string | null;
  date_remise_destinataire: string | null;
  dernier_statut: string | null;
  created_at: string;
}

export interface PageResult {
  items: MailRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  preferred_locale: string;
}

export interface UserAdmin extends User {
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface StatusHistoryItem {
  old_status: string | null;
  new_status: string | null;
  changed_at: string;
  note: string | null;
}

export interface MailDetail extends MailRecord {
  history: StatusHistoryItem[];
  has_pdf: boolean;
  attachment: { original_filename: string | null; byte_size: number; uploaded_at: string } | null;
}

export interface AuditEntry {
  id: number;
  at: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  ip: string | null;
  actor_username: string | null;
  actor_full_name: string | null;
  detail: Record<string, unknown> | null;
}

export interface AuditPage {
  items: AuditEntry[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  year: number;
  totals: { entree: number; sortie: number; total: number };
  by_status: { status: string; count: number }[];
  by_type: { type: string; count: number }[];
  by_month: { month: number; entree: number; sortie: number }[];
  pending: number;
  recent: MailRecord[];
}
