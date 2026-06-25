// Local, rule-based assistant knowledge base. No model, no cloud inference —
// just predefined in-app guidance, matched by keywords (see match.ts).

export interface Intent {
  id: string;
  kw: string[];
  fr: string;
  en: string;
  route?: string;
  chip?: { fr: string; en: string };
}

export const GREETING = {
  fr: "Bonjour 👋 Je suis l'assistant du Bureau d'Ordre. Posez-moi une question sur l'application (ex. « comment enregistrer un document ? »).",
  en: "Hello 👋 I'm the Bureau d'Ordre assistant. Ask me anything about the app (e.g. \"how do I register a document?\").",
};

export const FALLBACK: Intent = {
  id: "fallback",
  kw: [],
  fr: "Je ne suis pas sûr de comprendre. Je peux vous aider sur : la saisie d'un document, la recherche, les statuts, les exports, le suivi des retards ou les utilisateurs. Reformulez, ou choisissez un sujet ci-dessous.",
  en: "I'm not sure I understood. I can help with: registering a document, search, statuses, exports, overdue monitoring or users. Rephrase, or pick a topic below.",
};

export const KB: Intent[] = [
  { id: "help", kw: ["aide", "aider", "help", "que peux tu faire", "quoi faire", "what can you do", "sujets", "options"],
    fr: "Je peux vous guider pour : enregistrer un document, rechercher, changer un statut, joindre/voir un PDF, exporter en Excel, suivre les retards, gérer les utilisateurs ou changer votre mot de passe. Que voulez-vous faire ?",
    en: "I can help you: register a document, search, change a status, attach/view a PDF, export to Excel, track overdue items, manage users or change your password. What would you like to do?" },
  { id: "saisie", kw: ["enregistrer", "saisir", "saisie", "ajouter document", "nouveau document", "creer document", "creer un document", "register a document", "add document", "new document", "nouveau courrier", "ajouter courrier"],
    fr: "Pour enregistrer un document : ouvrez le registre Entrée ou Sortie, puis cliquez sur « + Saisir un document ». Le N° d'ordre et la date sont automatiques ; renseignez le Type et l'Objet, et joignez le PDF si besoin.",
    en: "To register a document: open the Entrée or Sortie register and click \"+ Saisir un document\". The order number and date are automatic; fill in the Type and Subject, and attach a PDF if needed.",
    route: "/entree", chip: { fr: "Enregistrer un document", en: "Register a document" } },
  { id: "search", kw: ["rechercher", "chercher", "trouver", "recherche", "filtrer", "filtre", "search", "find", "filter"],
    fr: "Utilisez la barre de recherche en haut (N° d'ordre, objet, expéditeur) ou les filtres Type et Statut au-dessus du journal.",
    en: "Use the search bar at the top (order number, subject, sender) or the Type and Status filters above the journal.",
    route: "/entree", chip: { fr: "Rechercher un document", en: "Search a document" } },
  { id: "status", kw: ["statut", "changer statut", "modifier statut", "clos", "cloturer", "en cours", "en attente", "annuler document", "status", "change status"],
    fr: "Ouvrez le document (icône ✎ sur sa ligne) puis « Modifier le statut » (En cours, En attente, Clos, Annulé). Chaque changement est historisé.",
    en: "Open the document (✎ icon on its row), then \"Modifier le statut\" (In progress, Pending, Closed, Cancelled). Every change is recorded.",
    route: "/entree", chip: { fr: "Changer un statut", en: "Change a status" } },
  { id: "edit", kw: ["modifier document", "corriger", "editer", "changer champ", "edit document", "update document", "modifier objet"],
    fr: "Ouvrez le document (✎) puis « Modifier » pour corriger ses champs (objet, expéditeur, projet…).",
    en: "Open the document (✎) then \"Modifier\" to edit its fields (subject, sender, project…).",
    route: "/entree" },
  { id: "pdf", kw: ["pdf", "scan", "scanner", "joindre", "piece jointe", "copie pdf", "voir pdf", "attach", "upload pdf"],
    fr: "Joignez le PDF lors de la saisie, ou plus tard depuis le détail du document. Cliquez sur « Voir le PDF joint » pour l'ouvrir. Format PDF, 20 Mo max.",
    en: "Attach the PDF during registration, or later from the document detail. Click \"Voir le PDF joint\" to open it. PDF only, 20 MB max." },
  { id: "export", kw: ["exporter", "export", "excel", "xlsx", "telecharger", "download", "tableur"],
    fr: "Cliquez sur « Exporter Excel » en haut du journal. L'export respecte les filtres actifs : ce que vous voyez est ce qui est exporté.",
    en: "Click \"Exporter Excel\" at the top of the journal. The export respects your active filters.",
    route: "/entree", chip: { fr: "Exporter en Excel", en: "Export to Excel" } },
  { id: "suivi", kw: ["retard", "en retard", "suivi", "surveiller", "observabilite", "alerte", "monitoring", "sans pdf", "ancienne", "overdue", "late"],
    fr: "Dans un registre, ouvrez l'onglet « Suivi » (administrateur) : documents en retard, sans PDF, ancienneté et éléments à surveiller. Cliquez une carte pour filtrer le journal.",
    en: "In a register, open the \"Suivi\" tab (admin): overdue documents, missing PDFs, aging and items to watch. Click a card to filter the journal.",
    route: "/entree?view=suivi", chip: { fr: "Voir les retards", en: "See overdue items" } },
  { id: "dashboard", kw: ["tableau de bord", "statistiques", "vue ensemble", "dashboard", "kpi", "chiffres", "graphique"],
    fr: "Le Tableau de bord (administrateur) donne la synthèse de l'année : volumes Entrée/Sortie, activité mensuelle, répartitions et documents récents.",
    en: "The Dashboard (admin) shows the yearly overview: Entrée/Sortie volumes, monthly activity, distributions and recent documents.",
    route: "/tableau" },
  { id: "users", kw: ["utilisateur", "compte", "ajouter utilisateur", "creer compte", "employe", "gerer utilisateurs", "user", "add user", "manage users"],
    fr: "Menu « Utilisateurs » (administrateur) : ajoutez, modifiez, désactivez ou supprimez des comptes, et réinitialisez les mots de passe.",
    en: "\"Utilisateurs\" menu (admin): add, edit, deactivate or delete accounts, and reset passwords.",
    route: "/utilisateurs", chip: { fr: "Gérer les utilisateurs", en: "Manage users" } },
  { id: "resetpw", kw: ["reinitialiser mot de passe", "reset mot de passe", "oublie mot de passe", "mot de passe utilisateur", "reset password"],
    fr: "Un administrateur peut réinitialiser un mot de passe : Utilisateurs → ✎ ou « Réinitialiser le mot de passe » sur la ligne du compte.",
    en: "An admin can reset a password: Utilisateurs → ✎ or \"Réinitialiser le mot de passe\" on the account row.",
    route: "/utilisateurs" },
  { id: "mypw", kw: ["changer mon mot de passe", "mon mot de passe", "modifier mon mot de passe", "change my password"],
    fr: "Allez dans Paramètres → « Changer mon mot de passe ».",
    en: "Go to Settings → \"Change my password\".",
    route: "/parametres", chip: { fr: "Changer mon mot de passe", en: "Change my password" } },
  { id: "lang", kw: ["langue", "francais", "anglais", "english", "traduire", "language"],
    fr: "Basculez FR/EN avec le sélecteur en haut à droite, ou dans Paramètres → Langue.",
    en: "Switch FR/EN with the toggle at the top right, or in Settings → Language.",
    route: "/parametres" },
  { id: "audit", kw: ["journal activite", "tracabilite", "logs", "historique actions", "qui a fait", "audit", "activity log"],
    fr: "Le « Journal d'activité » (administrateur) trace toutes les actions (connexions, créations, statuts, exports), filtrable et exportable.",
    en: "The \"Activity log\" (admin) records every action (logins, creations, statuses, exports), filterable and exportable.",
    route: "/journal-activite" },
  { id: "threshold", kw: ["seuil retard", "jours retard", "delai retard", "seuil"],
    fr: "Réglez le seuil « en retard » (7 jours par défaut) dans Paramètres → Suivi & alertes.",
    en: "Set the overdue threshold (7 days by default) in Settings → Monitoring & alerts.",
    route: "/parametres" },
  { id: "sortie", kw: ["sortie", "courrier depart", "courrier envoye", "outgoing"],
    fr: "Le registre Sortie regroupe le courrier envoyé. Ouvrez-le depuis le menu de gauche.",
    en: "The Sortie register holds outgoing mail. Open it from the left menu.",
    route: "/sortie" },
  { id: "logout", kw: ["deconnexion", "se deconnecter", "quitter", "logout", "sign out"],
    fr: "Cliquez sur votre nom en bas de la barre latérale pour vous déconnecter.",
    en: "Click your name at the bottom of the sidebar to sign out." },
  { id: "numbering", kw: ["numero", "n ordre", "numerotation", "boe", "bos", "numero ordre", "order number"],
    fr: "Le N° d'ordre (BOE… pour l'Entrée, BOS… pour la Sortie) est attribué automatiquement, unique et réinitialisé chaque année.",
    en: "The order number (BOE… for Entrée, BOS… for Sortie) is assigned automatically, unique and reset each year." },
  { id: "guide", kw: ["guide", "manuel", "documentation", "aide installation", "mode emploi", "manual"],
    fr: "Le guide complet est disponible dans Paramètres → « Guide d'utilisation ».",
    en: "The full guide is available in Settings → \"User guide\".",
    route: "/parametres" },
];

export const SUGGESTIONS = KB.filter((i) => i.chip).slice(0, 6);
