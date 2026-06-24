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
