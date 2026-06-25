// Local, predefined in-app help. No model, no cloud inference — a fixed list of
// questions the user picks from, rendered as a grouped FAQ in the Assistant panel.

export interface FaqItem {
  id: string;
  q: { fr: string; en: string }; // the question shown on the button
  fr: string; // the answer, French
  en: string; // the answer, English
  route?: string; // optional "go there" deep-link
}

const ITEMS: FaqItem[] = [
  {
    id: "saisie",
    q: { fr: "Comment enregistrer un document ?", en: "How do I register a document?" },
    fr: "Ouvrez le registre Entrée ou Sortie, puis cliquez sur « + Saisir un document ». Le N° d'ordre et la date sont automatiques ; renseignez le Type et l'Objet, et joignez le PDF si besoin.",
    en: 'Open the Entrée or Sortie register and click "+ Saisir un document". The order number and date are automatic; fill in the Type and Subject, and attach a PDF if needed.',
    route: "/entree",
  },
  {
    id: "search",
    q: { fr: "Comment rechercher un document ?", en: "How do I find a document?" },
    fr: "Utilisez la barre de recherche en haut (N° d'ordre, objet, expéditeur) ou les filtres Type et Statut au-dessus du journal.",
    en: "Use the search bar at the top (order number, subject, sender) or the Type and Status filters above the journal.",
    route: "/entree",
  },
  {
    id: "status",
    q: { fr: "Comment changer le statut d'un document ?", en: "How do I change a document's status?" },
    fr: "Ouvrez le document (icône ✎ sur sa ligne) puis « Modifier le statut » (En cours, En attente, Clos, Annulé). Chaque changement est historisé.",
    en: 'Open the document (✎ icon on its row), then "Modifier le statut" (In progress, Pending, Closed, Cancelled). Every change is recorded.',
    route: "/entree",
  },
  {
    id: "edit",
    q: { fr: "Comment modifier un document ?", en: "How do I edit a document?" },
    fr: "Ouvrez le document (✎) puis « Modifier » pour corriger ses champs (objet, expéditeur, projet…).",
    en: 'Open the document (✎) then "Modifier" to edit its fields (subject, sender, project…).',
    route: "/entree",
  },
  {
    id: "pdf",
    q: { fr: "Comment joindre ou voir un PDF ?", en: "How do I attach or view a PDF?" },
    fr: "Joignez le PDF lors de la saisie, ou plus tard depuis le détail du document. Cliquez sur « Voir le PDF joint » pour l'ouvrir. Format PDF, 20 Mo max.",
    en: 'Attach the PDF during registration, or later from the document detail. Click "Voir le PDF joint" to open it. PDF only, 20 MB max.',
  },
  {
    id: "export",
    q: { fr: "Comment exporter en Excel ?", en: "How do I export to Excel?" },
    fr: "Cliquez sur « Exporter Excel » en haut du journal. L'export respecte les filtres actifs : ce que vous voyez est ce qui est exporté.",
    en: 'Click "Exporter Excel" at the top of the journal. The export respects your active filters: what you see is what gets exported.',
    route: "/entree",
  },
  {
    id: "numbering",
    q: { fr: "Comment fonctionne le N° d'ordre ?", en: "How does the order number work?" },
    fr: "Le N° d'ordre (BOE… pour l'Entrée, BOS… pour la Sortie) est attribué automatiquement, unique et réinitialisé chaque année.",
    en: "The order number (BOE… for Entrée, BOS… for Sortie) is assigned automatically, unique and reset each year.",
  },
  {
    id: "sortie",
    q: { fr: "À quoi sert le registre Sortie ?", en: "What is the Sortie register for?" },
    fr: "Le registre Sortie regroupe le courrier envoyé. Ouvrez-le depuis le menu de gauche.",
    en: "The Sortie register holds outgoing mail. Open it from the left menu.",
    route: "/sortie",
  },
  {
    id: "suivi",
    q: { fr: "Comment voir les documents en retard ?", en: "How do I see overdue documents?" },
    fr: "Dans un registre, ouvrez l'onglet « Suivi » (administrateur) : documents en retard, sans PDF, ancienneté et éléments à surveiller. Cliquez une carte pour filtrer le journal.",
    en: 'In a register, open the "Suivi" tab (admin): overdue documents, missing PDFs, aging and items to watch. Click a card to filter the journal.',
    route: "/entree?view=suivi",
  },
  {
    id: "dashboard",
    q: { fr: "À quoi sert le tableau de bord ?", en: "What is the dashboard for?" },
    fr: "Le Tableau de bord (administrateur) donne la synthèse de l'année : volumes Entrée/Sortie, activité mensuelle, répartitions et documents récents.",
    en: "The Dashboard (admin) shows the yearly overview: Entrée/Sortie volumes, monthly activity, distributions and recent documents.",
    route: "/tableau",
  },
  {
    id: "users",
    q: { fr: "Comment gérer les utilisateurs ?", en: "How do I manage users?" },
    fr: "Menu « Utilisateurs » (administrateur) : ajoutez, modifiez, désactivez ou supprimez des comptes, et réinitialisez les mots de passe.",
    en: '"Utilisateurs" menu (admin): add, edit, deactivate or delete accounts, and reset passwords.',
    route: "/utilisateurs",
  },
  {
    id: "resetpw",
    q: { fr: "Comment réinitialiser le mot de passe d'un utilisateur ?", en: "How do I reset a user's password?" },
    fr: "Un administrateur peut réinitialiser un mot de passe : Utilisateurs → ✎ ou « Réinitialiser le mot de passe » sur la ligne du compte.",
    en: 'An admin can reset a password: Utilisateurs → ✎ or "Réinitialiser le mot de passe" on the account row.',
    route: "/utilisateurs",
  },
  {
    id: "audit",
    q: { fr: "Où voir le journal d'activité ?", en: "Where is the activity log?" },
    fr: "Le « Journal d'activité » (administrateur) trace toutes les actions (connexions, créations, statuts, exports), filtrable et exportable.",
    en: 'The "Activity log" (admin) records every action (logins, creations, statuses, exports), filterable and exportable.',
    route: "/journal-activite",
  },
  {
    id: "threshold",
    q: { fr: "Comment régler le seuil de retard ?", en: "How do I set the overdue threshold?" },
    fr: "Réglez le seuil « en retard » (7 jours par défaut) dans Paramètres → Suivi & alertes.",
    en: "Set the overdue threshold (7 days by default) in Settings → Monitoring & alerts.",
    route: "/parametres",
  },
  {
    id: "mypw",
    q: { fr: "Comment changer mon mot de passe ?", en: "How do I change my password?" },
    fr: "Allez dans Paramètres → « Changer mon mot de passe ».",
    en: 'Go to Settings → "Change my password".',
    route: "/parametres",
  },
  {
    id: "lang",
    q: { fr: "Comment changer la langue (FR / EN) ?", en: "How do I change the language (FR / EN)?" },
    fr: "Basculez FR/EN avec le sélecteur en haut à droite, ou dans Paramètres → Langue.",
    en: "Switch FR/EN with the toggle at the top right, or in Settings → Language.",
    route: "/parametres",
  },
  {
    id: "logout",
    q: { fr: "Comment me déconnecter ?", en: "How do I sign out?" },
    fr: "Cliquez sur le bouton de déconnexion en bas de la barre latérale, à droite de votre nom.",
    en: "Click the logout button at the bottom of the sidebar, to the right of your name.",
  },
  {
    id: "guide",
    q: { fr: "Où trouver le guide complet ?", en: "Where is the full guide?" },
    fr: "Le guide complet est disponible dans Paramètres → « Guide d'utilisation ».",
    en: 'The full guide is available in Settings → "User guide".',
    route: "/parametres",
  },
];

const byId: Record<string, FaqItem> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const FAQ_GROUPS: { id: string; fr: string; en: string; items: FaqItem[] }[] = [
  {
    id: "daily",
    fr: "Au quotidien",
    en: "Everyday",
    items: ["saisie", "search", "status", "edit", "pdf", "export", "numbering", "sortie"].map((id) => byId[id]),
  },
  {
    id: "admin",
    fr: "Administration",
    en: "Administration",
    items: ["suivi", "dashboard", "users", "resetpw", "audit", "threshold"].map((id) => byId[id]),
  },
  {
    id: "account",
    fr: "Mon compte",
    en: "My account",
    items: ["mypw", "lang", "logout", "guide"].map((id) => byId[id]),
  },
];
