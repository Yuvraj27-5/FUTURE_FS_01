// ============================================================
// FolioHub API Client
// ============================================================
const API = {
  base: '/api',
  async req(method, url, data, isForm=false) {
    const opts = { method, credentials: 'include', headers: {} };
    if (data) {
      if (isForm) opts.body = data;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(data); }
    }
    const res = await fetch(this.base + url, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  },
  get: (url) => API.req('GET', url),
  post: (url, d) => API.req('POST', url, d),
  put: (url, d) => API.req('PUT', url, d),
  del: (url) => API.req('DELETE', url),
  postForm: (url, d) => API.req('POST', url, d, true),
  putForm: (url, d) => API.req('PUT', url, d, true),
};

// ============================================================
// App State
// ============================================================
const State = {
  user: null,
  projects: [],
  notifCount: 0,
  currentPage: 'landing',

  setUser(u) {
    this.user = u;
    localStorage.setItem('fh_user', JSON.stringify(u));
  },
  loadUser() {
    try { this.user = JSON.parse(localStorage.getItem('fh_user')); } catch {}
    return this.user;
  },
  clearUser() {
    this.user = null;
    localStorage.removeItem('fh_user');
  }
};

// ============================================================
// Toast Notifications
// ============================================================
function toast(msg, type='success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${type==='error'?'❌':type==='warn'?'⚠️':'✅'}</span> ${msg}`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 400); }, 3500);
}

// ============================================================
// Utility
// ============================================================
function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function avatarHTML(user, size=36) {
  const initials = (user?.full_name||user?.username||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const colors = ['#e8ff47','#47b8ff','#ff4d6d','#7c5cff','#47ffb8','#ff9f47'];
  const color = colors[(user?.id||0) % colors.length];
  if (user?.avatar) {
    return `<img src="${user.avatar}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML=avatarFallback('${initials}','${color}',${size})"/>`;
  }
  return `<div class="av-circle" style="width:${size}px;height:${size}px;background:${color};font-size:${size*0.35}px">${initials}</div>`;
}

function avatarFallback(i, c, s) {
  return `<div class="av-circle" style="width:${s}px;height:${s}px;background:${c};font-size:${s*0.35}px">${i}</div>`;
}

function categoryEmoji(cat) {
  const map = {'Web Development':'⚛️','UI/UX Design':'🎨','Mobile App':'📱','AI / ML':'🤖','Branding':'✒️','Illustration':'✏️','Photography':'📷','3D Art':'🎭','Motion':'🎬'};
  return map[cat] || '💼';
}

function gradientForId(id) {
  const grads = [
    'linear-gradient(135deg,#0a1a0e,#0a141a)',
    'linear-gradient(135deg,#1a0a16,#0e0a1a)',
    'linear-gradient(135deg,#1a180a,#1a0e0a)',
    'linear-gradient(135deg,#0a0d1a,#0a161a)',
    'linear-gradient(135deg,#1a0d0d,#0f0d1a)',
    'linear-gradient(135deg,#0d1a1a,#0a1210)',
  ];
  return grads[(id||0) % grads.length];
}

// ============================================================
// Page Router
// ============================================================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + name);
  if (el) el.classList.add('active');
  State.currentPage = name;
  window.scrollTo(0,0);
  closeAllDropdowns();
}

function showApp(tab='dashboard') {
  showPage('app');
  switchTab(tab);
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
}

// ============================================================
// App Tab Switcher
// ============================================================
function switchTab(name) {
  document.querySelectorAll('.subpage').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('sub-' + name);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll(`.nav-tab[data-tab="${name}"]`).forEach(t => t.classList.add('active'));
  document.querySelectorAll('.s-item').forEach(t => t.classList.remove('active'));
  document.querySelectorAll(`.s-item[data-tab="${name}"]`).forEach(t => t.classList.add('active'));

  if (name === 'dashboard') loadDashboard();
  if (name === 'explore') loadExplore();
  if (name === 'hire') loadHire();
  if (name === 'profile') loadProfile();
  if (name === 'notifications') loadNotifications();
  if (name === 'saved') loadSaved();
}
