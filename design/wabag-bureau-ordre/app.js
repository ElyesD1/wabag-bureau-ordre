// WABAG · Bureau d'Ordre — prototype interactions (proto only)
const $ = (id) => document.getElementById(id);

function setProto(active) {
  ['ps-login', 'ps-app', 'ps-saisie'].forEach((id) => $(id).classList.remove('is-active'));
  if (active) $(active).classList.add('is-active');
}

function showLogin() {
  $('login').style.display = 'grid';
  $('app').classList.remove('is-active');
  closeDrawer();
  setProto('ps-login');
}

function enterApp() {
  $('login').style.display = 'none';
  $('app').classList.add('is-active');
  closeDrawer();
  setProto('ps-app');
}

function openDrawer() {
  if (!$('app').classList.contains('is-active')) enterApp();
  $('drawer').classList.add('is-open');
  $('scrim').classList.add('is-open');
  setProto('ps-saisie');
}

function closeDrawer() {
  $('drawer').classList.remove('is-open');
  $('scrim').classList.remove('is-open');
  if ($('app').classList.contains('is-active')) setProto('ps-app');
}

// FR / EN toggle (visual demo)
document.querySelectorAll('.lang button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.lang button').forEach((x) => x.classList.remove('is-active'));
    b.classList.add('is-active');
  });
});

// Entrée / Sortie filter tabs (visual demo)
document.querySelectorAll('.chip-tab button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.chip-tab button').forEach((x) => x.classList.remove('is-active'));
    b.classList.add('is-active');
  });
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

// Start on the login screen
showLogin();
