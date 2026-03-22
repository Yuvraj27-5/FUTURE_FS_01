// ============================================================
// FolioHub API Client
// ============================================================
const API = {
  base: '/api',
  async req(method, url, data, isForm = false) {
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
  notifCount: 0,
  setUser(u) { this.user = u; try { localStorage.setItem('fh_user', JSON.stringify(u)); } catch{} },
  loadUser() { try { this.user = JSON.parse(localStorage.getItem('fh_user')); } catch{} return this.user; },
  clearUser() { this.user = null; try { localStorage.removeItem('fh_user'); } catch{} }
};

// ============================================================
// Toast Notifications
// ============================================================
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${type==='error'?'❌':type==='warn'?'⚠️':'✅'}</span> ${msg}`;
  const container = document.getElementById('toastContainer');
  if (container) container.appendChild(t);
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
  return grads[(id || 0) % grads.length];
}

function avColor(id) {
  const colors = ['#e8ff47','#47b8ff','#ff4d6d','#7c5cff','#47ffb8','#ff9f47'];
  return colors[(id || 0) % colors.length];
}

// ============================================================
// Page Router
// ============================================================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + name);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
  closeDropdowns();
}

function showApp(tab = 'dashboard') {
  showPage('app');
  switchTab(tab);
}

function closeDropdowns() {
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
  closeDropdowns();

  if (name === 'dashboard') loadDashboard();
  else if (name === 'explore') loadExplore();
  else if (name === 'hire') loadHire();
  else if (name === 'profile') loadProfile();
  else if (name === 'notifications') loadNotifications();
  else if (name === 'saved') loadSaved();
  else if (name === 'settings') loadSettings();
}

// ============================================================
// AUTH
// ============================================================
async function checkAuth() {
  try {
    const user = await API.get('/auth/me');
    State.setUser(user);
    updateNavForUser();
    return user;
  } catch {
    State.clearUser();
    return null;
  }
}

function updateNavForUser() {
  const u = State.user;
  if (!u) return;
  const initials = (u.full_name || u.username || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const color = avColor(u.id);
  document.querySelectorAll('.user-av').forEach(el => {
    if (u.avatar) el.innerHTML = `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;"/>`;
    else el.textContent = initials;
  });
  const sav = document.getElementById('sidebarUserAv');
  if (sav) {
    if (u.avatar) sav.innerHTML = `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:9px;"/>`;
    else { sav.style.background = `linear-gradient(135deg,${color},${color}aa)`; sav.textContent = initials; }
  }
  const sname = document.getElementById('sidebarUserName');
  const srole = document.getElementById('sidebarUserRole');
  if (sname) sname.textContent = u.full_name || u.username;
  if (srole) srole.textContent = u.headline || 'Creative Professional';
  const ddName = document.getElementById('ddUserName');
  const ddEmail = document.getElementById('ddUserEmail');
  if (ddName) ddName.textContent = u.full_name || u.username;
  if (ddEmail) ddEmail.textContent = u.email;
  loadNotifBadge();
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return toast('Please fill all fields', 'error');
  btn.textContent = 'Signing in...'; btn.disabled = true;
  try {
    const { user } = await API.post('/auth/login', { email, password });
    State.setUser(user);
    updateNavForUser();
    toast(`Welcome back, ${user.full_name.split(' ')[0]}! 👋`);
    showApp('dashboard');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.textContent = 'Sign In →'; btn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  const data = {
    full_name: document.getElementById('regName').value.trim(),
    username: document.getElementById('regUsername').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    password: document.getElementById('regPassword').value,
  };
  if (!data.full_name || !data.username || !data.email || !data.password)
    return toast('Please fill all fields', 'error');
  if (data.password.length < 6) return toast('Password must be at least 6 characters', 'error');
  btn.textContent = 'Creating account...'; btn.disabled = true;
  try {
    const { user } = await API.post('/auth/register', data);
    State.setUser(user);
    updateNavForUser();
    toast(`Account created! Welcome, ${user.full_name.split(' ')[0]}! 🎉`);
    showApp('dashboard');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.textContent = 'Create Free Account →'; btn.disabled = false;
  }
}

async function handleLogout() {
  try { await API.post('/auth/logout'); } catch {}
  State.clearUser();
  toast('Logged out successfully');
  showPage('landing');
}

async function loadNotifBadge() {
  try {
    const { unread } = await API.get('/notifications');
    State.notifCount = unread;
    document.querySelectorAll('.notif-dot').forEach(d => {
      d.style.display = unread > 0 ? 'block' : 'none';
    });
  } catch {}
}

// ============================================================
// DASHBOARD — Fixed with real activity, working analytics/activity tabs
// ============================================================
let dashCurrentTab = 'overview';

async function loadDashboard() {
  if (!State.user) return;
  renderDashShell();
  try {
    const [stats, projResp] = await Promise.all([
      API.get('/users/me/stats'),
      API.get('/projects?limit=8&sort=recent')
    ]);
    renderDashStats(stats);
    renderDashProjects(projResp.projects || []);
    renderDashChart(stats.weekly_views || []);
    loadDashActivity();
  } catch (err) {
    console.error('Dashboard load error:', err);
    // Still show UI even if stats fail
    renderDashStats({ profile_views: 0, total_likes: 0, projects: 0, followers: 0 });
    renderDashProjects([]);
    renderDashChart([]);
    loadDashActivity();
  }
}

function renderDashShell() {
  const u = State.user;
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const emoji = h < 12 ? '👋' : h < 17 ? '☀️' : '🌙';
  const greetEl = document.getElementById('dashGreet');
  const dateEl = document.getElementById('dashDate');
  if (greetEl) greetEl.textContent = `${greet}, ${(u?.full_name || u?.username || 'there').split(' ')[0]} ${emoji}`;
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function renderDashStats(s) {
  animCounter('statViews', s.profile_views || 0);
  animCounter('statLikes', s.total_likes || 0);
  animCounter('statProjects', s.projects || 0);
  animCounter('statFollowers', s.followers || 0);
}

function animCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let dur = 1400, t0 = performance.now();
  const tick = now => {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderDashChart(weeklyData) {
  const chart = document.getElementById('dashBarChart');
  if (!chart) return;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const vals = Array(7).fill(0);
  if (weeklyData && weeklyData.length) {
    weeklyData.forEach(d => {
      const dayIdx = new Date(d.date).getDay();
      vals[(dayIdx + 6) % 7] = parseInt(d.count) || 0;
    });
  }
  // Add some demo data if all zeros for visual purposes
  const hasData = vals.some(v => v > 0);
  const displayVals = hasData ? vals : [3, 7, 5, 12, 9, 15, 11];
  const max = Math.max(...displayVals, 1);

  chart.innerHTML = days.map((d, i) => `
    <div class="bar-col">
      <div class="bar-val" style="font-size:.62rem;color:var(--text3);margin-bottom:3px;font-family:'DM Mono',monospace">${displayVals[i]}</div>
      <div class="bar" style="height:0;background:${i >= 5 ? 'var(--accent)' : 'rgba(232,255,71,.15)'}" data-h="${(displayVals[i] / max * 100).toFixed(0)}"></div>
      <div class="bar-lbl">${d}</div>
    </div>`).join('');

  setTimeout(() => chart.querySelectorAll('.bar').forEach((b, i) => {
    setTimeout(() => {
      b.style.height = b.dataset.h + '%';
      b.style.transition = 'height 1s cubic-bezier(.4,0,.2,1)';
    }, i * 80);
  }), 200);
}

async function loadDashActivity() {
  const list = document.getElementById('activityList');
  if (!list) return;
  try {
    const { notifications } = await API.get('/notifications');
    if (!notifications || !notifications.length) {
      list.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-icon" style="font-size:2rem">🔔</div><p style="font-size:.82rem">No recent activity yet. Upload a project to get started!</p></div>`;
      return;
    }
    list.innerHTML = notifications.slice(0, 5).map((n, i) => {
      const icons = { like: '❤️', comment: '💬', follow: '👥', view: '👁', job_match: '💼', system: '🔔' };
      const colors = ['#e8ff47', '#47b8ff', '#ff4d6d', '#7c5cff', '#47ffb8'];
      const ic = icons[n.type] || '🔔';
      const av = (n.full_name || n.username || 'S').charAt(0).toUpperCase();
      const color = colors[i % colors.length];
      return `
        <div class="act-item" style="animation-delay:${i * 0.06}s">
          <div class="act-av" style="background:${color}">${av}</div>
          <div class="act-text">${n.message}</div>
          <div class="act-thumb">${ic}</div>
          <div class="act-time">${timeAgo(n.created_at)}</div>
        </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-icon" style="font-size:2rem">🔔</div><p style="font-size:.82rem">No recent activity yet.</p></div>`;
  }
}

function renderDashProjects(projects) {
  const grid = document.getElementById('dashProjectGrid');
  if (!grid) return;
  const myProjects = projects.filter(p => p.user_id === State.user?.id);
  if (!myProjects.length) {
    grid.innerHTML = `<div class="proj-add-card proj-card" onclick="openUploadModal()"><div class="proj-add-icon">➕</div><div class="proj-add-lbl">Upload Your First Project</div></div>`;
    return;
  }
  grid.innerHTML = myProjects.map(p => projectCardHTML(p, true)).join('') +
    `<div class="proj-card proj-add-card" onclick="openUploadModal()"><div class="proj-add-icon">➕</div><div class="proj-add-lbl">Upload New</div></div>`;
}

// Dashboard tab switching — Analytics & Activity
function setDTab(el) {
  document.querySelectorAll('.d-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  dashCurrentTab = el.textContent.trim().toLowerCase();
  const tabName = el.textContent.trim();

  const analyticsSection = document.getElementById('analyticsSection');
  const activitySection = document.getElementById('activitySection');
  const overviewSection = document.getElementById('overviewSection');

  if (tabName === 'Overview') {
    if (overviewSection) overviewSection.style.display = '';
    if (analyticsSection) analyticsSection.style.display = 'none';
    if (activitySection) activitySection.style.display = 'none';
  } else if (tabName === 'Analytics') {
    if (overviewSection) overviewSection.style.display = 'none';
    if (analyticsSection) analyticsSection.style.display = 'block';
    if (activitySection) activitySection.style.display = 'none';
    renderAnalyticsTab();
  } else if (tabName === 'Activity') {
    if (overviewSection) overviewSection.style.display = 'none';
    if (analyticsSection) analyticsSection.style.display = 'none';
    if (activitySection) activitySection.style.display = 'block';
    renderActivityTab();
  }
}

async function renderAnalyticsTab() {
  const container = document.getElementById('analyticsSection');
  if (!container) return;
  container.innerHTML = `
    <div class="analytics-grid">
      <div class="chart-box" style="margin-bottom:18px">
        <div class="chart-hdr"><div class="chart-title">📈 Profile Views (Last 7 Days)</div>
          <div class="period-btns">
            <button class="p-btn active" onclick="setPBtn(this)">7D</button>
            <button class="p-btn" onclick="setPBtn(this)">1M</button>
            <button class="p-btn" onclick="setPBtn(this)">3M</button>
          </div>
        </div>
        <div class="bar-chart-wrap" id="analyticsBarChart" style="height:140px"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
        <div class="chart-box">
          <div class="chart-hdr"><div class="chart-title">🌍 Views by Source</div></div>
          <div class="donut-container">
            <svg class="donut-svg" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="42" fill="none" stroke="var(--surface2)" stroke-width="15"/>
              <circle cx="55" cy="55" r="42" fill="none" stroke="var(--accent)" stroke-width="15" stroke-dasharray="158 106" stroke-dashoffset="-26" stroke-linecap="round"/>
              <circle cx="55" cy="55" r="42" fill="none" stroke="var(--accent3)" stroke-width="15" stroke-dasharray="63 201" stroke-dashoffset="-184" stroke-linecap="round"/>
              <circle cx="55" cy="55" r="42" fill="none" stroke="var(--accent4)" stroke-width="15" stroke-dasharray="43 221" stroke-dashoffset="-247" stroke-linecap="round"/>
              <text x="55" y="51" text-anchor="middle" font-size="14" font-weight="800" font-family="Syne,sans-serif" fill="#f0f2f5">60%</text>
              <text x="55" y="63" text-anchor="middle" font-size="7.5" fill="#8a94a6" font-family="Figtree,sans-serif">Direct</text>
            </svg>
            <div class="donut-legend">
              <div class="donut-item"><div class="donut-dot" style="background:var(--accent)"></div><div class="donut-lbl">Direct Search</div><div class="donut-val">60%</div></div>
              <div class="donut-item"><div class="donut-dot" style="background:var(--accent3)"></div><div class="donut-lbl">Social Media</div><div class="donut-val">24%</div></div>
              <div class="donut-item"><div class="donut-dot" style="background:var(--accent4)"></div><div class="donut-lbl">Referral</div><div class="donut-val">16%</div></div>
            </div>
          </div>
        </div>
        <div class="chart-box">
          <div class="chart-hdr"><div class="chart-title">🏆 Top Projects</div></div>
          <div id="topProjectsList" style="margin-top:8px"><div class="loading-spinner" style="width:24px;height:24px;margin:20px auto"></div></div>
        </div>
      </div>
      <div class="chart-box">
        <div class="chart-hdr"><div class="chart-title">📊 Engagement Summary</div></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:8px" id="engagementStats">
          <div class="loading-spinner" style="width:24px;height:24px;margin:20px auto;grid-column:1/-1"></div>
        </div>
      </div>
    </div>`;

  // Load analytics data
  try {
    const stats = await API.get('/users/me/stats');
    renderAnalyticsChart(stats.weekly_views || []);
    const projResp = await API.get('/projects?limit=5&sort=views');
    const myProjs = (projResp.projects || []).filter(p => p.user_id === State.user?.id);
    const tpl = document.getElementById('topProjectsList');
    if (tpl) {
      if (!myProjs.length) { tpl.innerHTML = '<p style="font-size:.78rem;color:var(--text3);text-align:center;padding:16px">No projects yet</p>'; }
      else { tpl.innerHTML = myProjs.map(p => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:1.2rem">${categoryEmoji(p.category)}</span><div style="flex:1;min-width:0"><div style="font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.title}</div><div style="font-size:.7rem;color:var(--text3);font-family:'DM Mono',monospace">👁 ${p.views||0} · ❤️ ${p.likes_count||0}</div></div></div>`).join(''); }
    }
    const eng = document.getElementById('engagementStats');
    if (eng) {
      eng.innerHTML = [
        { label: 'Total Views', val: (stats.profile_views||0).toLocaleString(), icon: '👁' },
        { label: 'Appreciations', val: (stats.total_likes||0).toLocaleString(), icon: '❤️' },
        { label: 'Followers', val: (stats.followers||0).toLocaleString(), icon: '👥' },
      ].map(s => `<div style="background:var(--surface2);border-radius:10px;padding:16px;text-align:center"><div style="font-size:1.6rem;margin-bottom:6px">${s.icon}</div><div style="font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;color:var(--accent)">${s.val}</div><div style="font-size:.72rem;color:var(--text2);margin-top:3px">${s.label}</div></div>`).join('');
    }
  } catch {}
}

function renderAnalyticsChart(weeklyData) {
  const chart = document.getElementById('analyticsBarChart');
  if (!chart) return;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const vals = Array(7).fill(0);
  if (weeklyData && weeklyData.length) weeklyData.forEach(d => { vals[(new Date(d.date).getDay() + 6) % 7] = parseInt(d.count) || 0; });
  const displayVals = vals.some(v => v > 0) ? vals : [3, 7, 5, 12, 9, 15, 11];
  const max = Math.max(...displayVals, 1);
  chart.innerHTML = days.map((d, i) => `
    <div class="bar-col">
      <div class="bar-val" style="font-size:.62rem;color:var(--text3);margin-bottom:3px;font-family:'DM Mono',monospace">${displayVals[i]}</div>
      <div class="bar" style="height:0;background:${i >= 5 ? 'var(--accent)' : 'rgba(232,255,71,.15)'}" data-h="${(displayVals[i]/max*100).toFixed(0)}"></div>
      <div class="bar-lbl">${d}</div>
    </div>`).join('');
  setTimeout(() => chart.querySelectorAll('.bar').forEach((b, i) => { setTimeout(() => { b.style.height = b.dataset.h + '%'; b.style.transition = 'height 1s cubic-bezier(.4,0,.2,1)'; }, i * 80); }), 100);
}

async function renderActivityTab() {
  const container = document.getElementById('activitySection');
  if (!container) return;
  container.innerHTML = `
    <div style="padding:0 0 16px">
      <h3 style="font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;margin-bottom:4px">📋 Activity Log</h3>
      <p style="font-size:.8rem;color:var(--text2)">All interactions on your portfolio</p>
    </div>
    <div id="fullActivityList"><div class="loading-spinner"></div></div>`;
  try {
    const { notifications } = await API.get('/notifications');
    const list = document.getElementById('fullActivityList');
    if (!list) return;
    if (!notifications || !notifications.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><p>No activity yet. Upload a project to get started!</p></div>`;
      return;
    }
    const icons = { like: '❤️', comment: '💬', follow: '👥', view: '👁', job_match: '💼', system: '🔔' };
    const colors = ['#e8ff47', '#47b8ff', '#ff4d6d', '#7c5cff', '#47ffb8'];
    list.innerHTML = notifications.map((n, i) => `
      <div class="act-item">
        <div class="act-av" style="background:${colors[i % colors.length]}">${(n.full_name || 'S').charAt(0).toUpperCase()}</div>
        <div class="act-text">${n.message}</div>
        <div class="act-thumb">${icons[n.type] || '🔔'}</div>
        <div class="act-time">${timeAgo(n.created_at)}</div>
      </div>`).join('');
  } catch {
    document.getElementById('fullActivityList').innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><p>No activity yet.</p></div>`;
  }
}

function setPBtn(el) {
  el.closest('.period-btns').querySelectorAll('.p-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

// ============================================================
// PROJECT CARD HTML
// ============================================================
function projectCardHTML(p, isOwn = false) {
  const bg = gradientForId(p.id);
  const emoji = categoryEmoji(p.category);
  return `
    <div class="proj-card" onclick="openProjectModal(${p.id})">
      <div class="proj-vis" style="background:${bg}">
        ${p.cover_image ? `<img src="${p.cover_image}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" onerror="this.style.display='none'"/>` : `<span style="font-size:2.8rem;position:relative;z-index:1">${emoji}</span>`}
        <div class="proj-hover">
          ${isOwn ? `<button class="p-act" onclick="event.stopPropagation()">✏️ Edit</button>` : ''}
          <button class="p-act" onclick="event.stopPropagation();toggleLike(${p.id},this)">${p.user_liked ? '❤️' : '🤍'} ${p.likes_count || 0}</button>
        </div>
      </div>
      <div class="proj-body">
        <div class="proj-title">${p.title}</div>
        <div class="proj-meta">
          <div class="proj-tags">${(p.tags || '').split(',').slice(0, 2).filter(Boolean).map(t => `<span class="proj-tag">${t.trim()}</span>`).join('')}</div>
          <div class="proj-likes">👁 ${(p.views || 0).toLocaleString()}</div>
        </div>
      </div>
    </div>`;
}

// ============================================================
// EXPLORE — Fixed grid/list toggle & full profile image in modal
// ============================================================
let exploreFilters = { search: '', category: '', location: '', work_type: '', sort: 'recent', page: 1 };
let exploreView = 'grid';
let exploreLoading = false;

async function loadExplore(reset = true) {
  if (reset) exploreFilters.page = 1;
  if (exploreLoading) return;
  exploreLoading = true;
  const container = document.getElementById('exploreMasonry');
  if (!container) { exploreLoading = false; return; }
  if (reset) container.innerHTML = `<div class="loading-spinner" style="grid-column:1/-1"></div>`;
  try {
    const params = new URLSearchParams({ ...exploreFilters, limit: 24 });
    const { projects, total, pages } = await API.get('/projects?' + params);
    if (reset) container.innerHTML = '';
    if (!projects || (!projects.length && reset)) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔭</div><p>No projects found. Try different filters.</p></div>`;
      const lb = document.getElementById('loadMoreBtn');
      if (lb) lb.style.display = 'none';
    } else {
      if (exploreView === 'list') {
        container.innerHTML += projects.map(p => exploreListCardHTML(p)).join('');
      } else {
        container.innerHTML += projects.map(p => exploreCardHTML(p)).join('');
      }
      const totalEl = document.getElementById('exploreTotal');
      if (totalEl) totalEl.textContent = `${(total || 0).toLocaleString()} projects found`;
      const lb = document.getElementById('loadMoreBtn');
      if (lb) lb.style.display = exploreFilters.page < (pages || 1) ? 'block' : 'none';
    }
  } catch (err) {
    if (container) container.innerHTML = `<div class="error-state" style="grid-column:1/-1">Failed to load projects.<button onclick="loadExplore()">Retry</button></div>`;
  } finally {
    exploreLoading = false;
  }
}

function setExploreView(view, btn) {
  exploreView = view;
  document.querySelectorAll('.vt-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const container = document.getElementById('exploreMasonry');
  if (!container) return;
  if (view === 'list') {
    container.style.columns = 'unset';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
  } else {
    container.style.columns = '';
    container.style.display = '';
    container.style.flexDirection = '';
    container.style.gap = '';
  }
  loadExplore();
}

function exploreCardHTML(p) {
  const bg = gradientForId(p.id);
  const emoji = categoryEmoji(p.category);
  const initials = (p.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `
    <div class="ex-card" onclick="openProjectModal(${p.id})">
      <div class="ex-vis" style="background:${bg};min-height:180px">
        ${p.cover_image ? `<img src="${p.cover_image}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" onerror="this.remove()"/>` : `<span style="font-size:3.5rem;position:relative;z-index:1">${emoji}</span>`}
        <div class="ex-hover">
          <button class="ex-save-btn" onclick="event.stopPropagation();toggleSave(${p.id},this)">${p.user_saved ? '🔖 Saved' : '💾 Save'}</button>
          <span style="color:rgba(255,255,255,.8);font-size:.7rem">▶ View</span>
        </div>
      </div>
      <div class="ex-body">
        <div class="ex-title">${p.title}</div>
        <div class="ex-author">
          <div class="av-circle" style="width:18px;height:18px;font-size:.5rem;flex-shrink:0;background:${avColor(p.user_id)}">${initials.charAt(0)}</div>
          <span>${p.full_name || 'Unknown'}</span>
          ${p.is_pro ? '<span class="pro-badge-sm">PRO</span>' : ''}
        </div>
        <div class="ex-stats">
          <span class="ex-stat">❤️ ${p.likes_count || 0}</span>
          <span class="ex-stat">👁 ${p.views || 0}</span>
          <span class="ex-cat-badge">${p.category}</span>
        </div>
      </div>
    </div>`;
}

function exploreListCardHTML(p) {
  const bg = gradientForId(p.id);
  const emoji = categoryEmoji(p.category);
  const initials = (p.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `
    <div style="display:flex;gap:16px;background:var(--surface);border:1px solid var(--border);border-radius:13px;overflow:hidden;cursor:pointer;transition:all .3s" onmouseover="this.style.borderColor='rgba(232,255,71,.2)'" onmouseout="this.style.borderColor='var(--border)'" onclick="openProjectModal(${p.id})">
      <div style="width:180px;flex-shrink:0;background:${bg};display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;min-height:120px">
        ${p.cover_image ? `<img src="${p.cover_image}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" onerror="this.remove()"/>` : `<span style="font-size:3rem;position:relative;z-index:1">${emoji}</span>`}
      </div>
      <div style="flex:1;padding:16px;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="font-weight:700;font-size:.95rem;margin-bottom:6px">${p.title}</div>
          <div style="font-size:.8rem;color:var(--text2);line-height:1.5;margin-bottom:8px">${(p.description||'').substring(0,120)}${(p.description||'').length>120?'...':''}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px">${(p.tags||'').split(',').filter(Boolean).slice(0,4).map(t=>`<span class="proj-tag">${t.trim()}</span>`).join('')}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px;font-size:.76rem;color:var(--text2)">
            <div class="av-circle" style="width:20px;height:20px;font-size:.52rem;background:${avColor(p.user_id)}">${initials.charAt(0)}</div>
            <span>${p.full_name||'Unknown'}</span>
            ${p.is_pro ? '<span class="pro-badge-sm">PRO</span>' : ''}
          </div>
          <div style="display:flex;gap:12px;font-size:.72rem;color:var(--text3);font-family:'DM Mono',monospace">
            <span>❤️ ${p.likes_count||0}</span><span>👁 ${p.views||0}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function setExploreFilter(key, val) {
  exploreFilters[key] = val;
  exploreFilters.page = 1;
  loadExplore();
}

function loadMoreExplore() {
  exploreFilters.page++;
  loadExplore(false);
}

function setCatChip(cat, el) {
  document.querySelectorAll('.ex-cat').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  const catFilter = document.getElementById('exploreCatFilter');
  if (catFilter) catFilter.value = cat;
  setExploreFilter('category', cat);
}

// Apply filters button
function applyExploreFilters() {
  const search = document.getElementById('exploreSearchInput')?.value || '';
  const category = document.getElementById('exploreCatFilter')?.value || '';
  const location = document.getElementById('exploreLocationFilter')?.value || '';
  const work_type = document.getElementById('exploreWorkTypeFilter')?.value || '';
  const sort = document.getElementById('exploreSortFilter')?.value || 'recent';
  exploreFilters = { search, category, location, work_type, sort, page: 1 };
  loadExplore();
  toast('Filters applied!');
}

// ============================================================
// PROJECT DETAIL MODAL — Fixed full avatar display
// ============================================================
async function openProjectModal(id) {
  const overlay = document.getElementById('projectModal');
  const inner = document.getElementById('projectModalInner');
  if (!overlay || !inner) return;
  inner.innerHTML = `<div class="modal-loading">⏳ Loading project...</div>`;
  overlay.classList.add('open');
  try {
    const p = await API.get('/projects/' + id);
    const bg = gradientForId(p.id);
    const emoji = categoryEmoji(p.category);
    const initials = (p.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const color = avColor(p.user_id);
    inner.innerHTML = `
      <button class="wm-close" onclick="closeProjectModal()">✕</button>
      <div class="wm-cover" style="background:${bg}">
        ${p.cover_image ? `<img src="${p.cover_image}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;"/>` : `<span style="font-size:8rem;position:relative;z-index:1">${emoji}</span>`}
        <div class="wm-cover-overlay"></div>
      </div>
      <div class="wm-scroll">
        <div class="wm-profile-row">
          <div class="wm-av" style="background:${color};overflow:hidden;position:relative">
            ${p.avatar
              ? `<img src="${p.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"/>`
              : `<span style="font-size:1.8rem;font-family:'Syne',sans-serif;font-weight:800;color:#08090b">${initials}</span>`
            }
            ${p.is_pro ? '<div class="wm-pro-badge">PRO</div>' : ''}
          </div>
          <div class="wm-info">
            <div class="wm-name">${p.full_name || p.username}</div>
            <div class="wm-loc">📍 ${p.location || 'Remote'} &nbsp;·&nbsp; <span style="color:var(--accent3)">${p.work_type === 'freelance' ? 'Available for Freelance' : p.work_type === 'full_time' ? 'Full-time' : 'Open to Work'}</span></div>
            <div class="wm-skills">${(p.skills || '').split(',').filter(Boolean).map(s => `<span class="wm-skill">${s.trim()}</span>`).join('')}</div>
          </div>
        </div>
        <div class="wm-btns">
          <button class="wm-btn-primary" onclick="openMessageModal(${p.user_id},'${(p.full_name||'').replace(/'/g,"\\'")}')">📧 Send Message</button>
          <button class="wm-btn-secondary" onclick="closeProjectModal();openUserModal('${p.username}')">👤 View Profile</button>
          ${State.user ? `
            <button class="wm-btn-icon ${p.user_liked ? 'liked' : ''}" id="wm-like-${p.id}" onclick="toggleLike(${p.id},this)">${p.user_liked ? '❤️' : '🤍'} ${p.likes_count || 0}</button>
            <button class="wm-btn-icon ${p.user_saved ? 'saved' : ''}" id="wm-save-${p.id}" onclick="toggleSave(${p.id},this)">${p.user_saved ? '🔖' : '💾'}</button>
          ` : ''}
        </div>
        <div class="wm-content">
          <h2 class="wm-title">${p.title}</h2>
          <div class="wm-meta-row">
            <span class="wm-cat-badge">${emoji} ${p.category}</span>
            <span>📅 ${new Date(p.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>👁 ${(p.views || 0).toLocaleString()} views</span>
          </div>
          ${p.description ? `<p class="wm-desc">${p.description.replace(/\n/g, '<br>')}</p>` : ''}
          ${p.tags ? `<div class="wm-tag-row">${p.tags.split(',').filter(Boolean).map(t => `<span class="wm-tag">${t.trim()}</span>`).join('')}</div>` : ''}
          <div class="wm-links">
            ${p.live_url ? `<a href="${p.live_url}" target="_blank" class="wm-link-btn">🚀 Live Demo</a>` : ''}
            ${p.github_url ? `<a href="${p.github_url}" target="_blank" class="wm-link-btn">🐙 GitHub</a>` : ''}
          </div>
          ${p.images && p.images.length > 0 ? `<div class="wm-images">${p.images.map(img => `<img src="${img.image_path}" style="width:100%;border-radius:10px;margin-bottom:12px;cursor:pointer;" onclick="window.open('${img.image_path}','_blank')"/>`).join('')}</div>` : ''}
        </div>
        <div class="wm-comments">
          <div class="wm-comments-title">💬 Comments (${p.comments_count || 0})</div>
          ${State.user ? `
            <div class="wm-comment-form">
              <div class="av-circle" style="width:32px;height:32px;background:var(--accent);font-size:.7rem;flex-shrink:0">${(State.user.full_name || '?').charAt(0)}</div>
              <input type="text" id="commentInput-${p.id}" placeholder="Add a comment..." class="comment-input" onkeydown="if(event.key==='Enter')postComment(${p.id})"/>
              <button class="btn-accent-sm" onclick="postComment(${p.id})">Post</button>
            </div>` : ''}
          <div id="commentsList-${p.id}">
            ${p.comments && p.comments.length
              ? p.comments.map(c => `
                <div class="comment-item">
                  <div class="av-circle" style="width:30px;height:30px;background:${avColor(c.user_id)};font-size:.6rem;flex-shrink:0">${(c.full_name || '?').charAt(0)}</div>
                  <div>
                    <div class="comment-author">${c.full_name} <span>${timeAgo(c.created_at)}</span></div>
                    <div class="comment-text">${c.content}</div>
                  </div>
                </div>`).join('')
              : `<p style="color:var(--text3);font-size:.82rem;padding:8px 0">No comments yet. Be the first!</p>`
            }
          </div>
        </div>
      </div>`;
  } catch (err) {
    inner.innerHTML = `<button class="wm-close" onclick="closeProjectModal()">✕</button><div style="padding:40px;text-align:center;color:var(--text2)">Failed to load project. ${err.message}</div>`;
  }
}

function closeProjectModal() { document.getElementById('projectModal')?.classList.remove('open'); }

async function postComment(projectId) {
  const input = document.getElementById(`commentInput-${projectId}`);
  if (!input || !input.value.trim()) return;
  const content = input.value.trim();
  try {
    await API.post(`/projects/${projectId}/comment`, { content });
    const list = document.getElementById(`commentsList-${projectId}`);
    if (list) {
      list.innerHTML += `
        <div class="comment-item">
          <div class="av-circle" style="width:30px;height:30px;background:var(--accent);font-size:.6rem;flex-shrink:0">${(State.user?.full_name || '?').charAt(0)}</div>
          <div><div class="comment-author">${State.user?.full_name || 'You'} <span>just now</span></div><div class="comment-text">${content}</div></div>
        </div>`;
    }
    input.value = '';
    toast('Comment posted!');
  } catch (err) { toast(err.message, 'error'); }
}

async function toggleLike(projectId, btn) {
  if (!State.user) { toast('Please log in to like projects', 'warn'); return; }
  try {
    const { liked } = await API.post(`/projects/${projectId}/like`);
    const num = parseInt((btn.textContent.match(/\d+/) || ['0'])[0]);
    btn.innerHTML = liked ? `❤️ ${num + 1}` : `🤍 ${Math.max(0, num - 1)}`;
    btn.classList.toggle('liked', liked);
  } catch (err) { toast(err.message, 'error'); }
}

async function toggleSave(projectId, btn) {
  if (!State.user) { toast('Please log in to save projects', 'warn'); return; }
  try {
    const { saved } = await API.post(`/projects/${projectId}/save`);
    btn.textContent = saved ? '🔖 Saved' : '💾 Save';
    toast(saved ? '🔖 Project saved!' : 'Removed from saved');
  } catch (err) { toast(err.message, 'error'); }
}

// ============================================================
// HIRE — Fixed My Jobs, How It Works, Post New Job
// ============================================================
let hireFilters = { search: '', location: '', work_type: '', skills: '', sort: 'recent' };
let hireCurrentTab = 'freelancers';

async function loadHire() {
  renderFreelancers();
}

function setHireTabView(tab, el) {
  document.querySelectorAll('.hire-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  hireCurrentTab = tab;
  const freelancerView = document.getElementById('hireFreelancerView');
  const myJobsView = document.getElementById('hireMyJobsView');
  const howItWorksView = document.getElementById('hireHowItWorksView');
  [freelancerView, myJobsView, howItWorksView].forEach(v => { if (v) v.style.display = 'none'; });
  if (tab === 'freelancers' && freelancerView) { freelancerView.style.display = ''; renderFreelancers(); }
  else if (tab === 'myjobs' && myJobsView) { myJobsView.style.display = ''; loadMyJobs(); }
  else if (tab === 'howitworks' && howItWorksView) howItWorksView.style.display = '';
}

async function renderFreelancers() {
  const list = document.getElementById('flList');
  if (!list) return;
  list.innerHTML = `<div class="loading-spinner"></div>`;
  try {
    const params = new URLSearchParams({ ...hireFilters, limit: 12 });
    const { users } = await API.get('/users?' + params);
    if (!users || !users.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>No freelancers found. Try different filters.</p></div>`;
      return;
    }
    list.innerHTML = users.map(u => freelancerCardHTML(u)).join('');
  } catch (err) {
    list.innerHTML = `<div class="error-state">Failed to load freelancers.<button onclick="renderFreelancers()">Retry</button></div>`;
  }
}

function applyHireFilters() {
  hireFilters.search = document.getElementById('hireSearchInput')?.value || '';
  hireFilters.location = document.getElementById('hireLocationInput')?.value || '';
  hireFilters.skills = document.getElementById('hireSkillsInput')?.value || '';
  renderFreelancers();
  toast('Filters applied!');
}

function setHireFilter(key, val) { hireFilters[key] = val; }

function setHireChip(skill, el) {
  document.querySelectorAll('#hireChips .chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  hireFilters.skills = skill;
  renderFreelancers();
}

async function loadMyJobs() {
  const view = document.getElementById('hireMyJobsView');
  if (!view) return;
  view.innerHTML = `<div style="padding:20px"><div class="loading-spinner"></div></div>`;
  try {
    const { jobs } = await API.get('/jobs');
    if (!jobs || !jobs.length) {
      view.innerHTML = `
        <div style="padding:24px">
          <div class="empty-state">
            <div class="empty-icon">💼</div>
            <p>No jobs posted yet.</p>
            <button class="btn-accent-sm" onclick="openPostJobModal()">Post Your First Job</button>
          </div>
        </div>`;
      return;
    }
    view.innerHTML = `
      <div style="padding:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h3 style="font-family:'Syne',sans-serif;font-weight:700">My Posted Jobs</h3>
          <button class="btn-accent-sm" onclick="openPostJobModal()">+ Post New Job</button>
        </div>
        ${jobs.map(j => `
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:12px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
              <div>
                <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem;margin-bottom:4px">${j.title}</div>
                <div style="font-size:.78rem;color:var(--text2);margin-bottom:8px">${j.description ? j.description.substring(0, 100) + '...' : 'No description'}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  ${j.job_type ? `<span style="padding:3px 9px;background:rgba(232,255,71,.08);border-radius:100px;font-size:.68rem;color:var(--accent);font-family:'DM Mono',monospace">${j.job_type}</span>` : ''}
                  ${j.location ? `<span style="padding:3px 9px;background:var(--surface2);border-radius:100px;font-size:.68rem;color:var(--text3)">${j.location}</span>` : ''}
                  <span style="padding:3px 9px;background:${j.status==='open'?'rgba(71,255,184,.1)':'var(--surface2)'};border-radius:100px;font-size:.68rem;color:${j.status==='open'?'var(--accent3)':'var(--text3)'}">${j.status}</span>
                </div>
              </div>
              <div style="font-size:.72rem;color:var(--text3);font-family:'DM Mono',monospace;white-space:nowrap">${timeAgo(j.created_at)}</div>
            </div>
          </div>`).join('')}
      </div>`;
  } catch {
    view.innerHTML = `<div style="padding:24px"><div class="error-state">Failed to load jobs.<button onclick="loadMyJobs()">Retry</button></div></div>`;
  }
}

function freelancerCardHTML(u) {
  const color = avColor(u.id);
  const initials = (u.full_name || u.username || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `
    <div class="fl-card" onclick="openUserModal('${u.username}')">
      <div class="fl-card-top">
        <div class="fl-av" style="background:${color};overflow:hidden">
          ${u.avatar ? `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;"/>` : initials}
        </div>
        <div class="fl-info">
          <div class="fl-name-row">
            <div class="fl-name">${u.full_name || u.username}</div>
            ${u.is_pro ? '<div class="fl-pro-badge">PRO</div>' : ''}
          </div>
          <div class="fl-headline">${u.headline || 'Creative Professional'}</div>
          <div class="fl-loc">📍 ${u.location || 'Remote'} · <span class="${u.is_available ? 'fl-avail' : 'fl-unavail'}">${u.is_available ? '✅ Available now' : '🔴 Not available'}</span></div>
          <div class="fl-skills">${(u.skills || '').split(',').slice(0, 4).filter(Boolean).map(s => `<span class="fl-skill">${s.trim()}</span>`).join('')}${(u.skills || '').split(',').filter(Boolean).length > 4 ? `<span class="fl-more">+${(u.skills||'').split(',').filter(Boolean).length - 4}</span>` : ''}</div>
        </div>
        <button class="fl-inquiry-btn" onclick="event.stopPropagation();openMessageModal(${u.id},'${(u.full_name||'').replace(/'/g,"\\'")}')">📧 Send Inquiry</button>
      </div>
      <div class="fl-card-foot">
        <div class="fl-stats">
          <span>📁 ${u.proj_count || 0} projects</span>
          <span>👥 ${u.follower_count || 0} followers</span>
          <span>💼 ${u.job_count || 0} jobs done</span>
        </div>
        ${u.work_type ? `<span class="work-type-badge">${u.work_type === 'freelance' ? 'Freelance' : u.work_type === 'full_time' ? 'Full-time' : 'Open to both'}</span>` : ''}
      </div>
    </div>`;
}

// ============================================================
// USER PROFILE MODAL — Fixed View Profile
// ============================================================
async function openUserModal(username) {
  const overlay = document.getElementById('userModal');
  const inner = document.getElementById('userModalInner');
  if (!overlay || !inner) return;
  inner.innerHTML = `<div class="modal-loading">⏳ Loading profile...</div>`;
  overlay.classList.add('open');
  try {
    const u = await API.get('/users/' + username);
    const color = avColor(u.id);
    const initials = (u.full_name || u.username || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    inner.innerHTML = `
      <button class="wm-close" onclick="closeUserModal()">✕</button>
      <div class="um-cover" style="${u.cover_photo ? 'background-image:url(' + u.cover_photo + ');background-size:cover;background-position:center' : ''}">
        <div class="um-cover-overlay"></div>
      </div>
      <div class="um-body">
        <div class="um-profile-row">
          <div class="um-av-wrap">
            <div class="um-av" style="background:${color};overflow:hidden">
              ${u.avatar
                ? `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"/>`
                : `<span style="font-size:1.8rem;font-family:'Syne',sans-serif;font-weight:800;color:#08090b">${initials}</span>`
              }
            </div>
            ${u.is_pro ? '<div class="um-pro">PRO</div>' : ''}
          </div>
          <div class="um-info">
            <div class="um-name">${u.full_name || u.username}</div>
            <div class="um-handle">@${u.username}</div>
            <div class="um-loc">📍 ${u.location || 'Remote'} · <span class="um-avail ${u.is_available ? 'avail' : ''}">${u.is_available ? 'Responds quickly' : 'Busy'}</span></div>
            ${u.bio ? `<p class="um-bio">${u.bio}</p>` : ''}
          </div>
        </div>
        <div class="um-stats-bar">
          <div class="um-stat"><div class="um-stat-n">${(u.total_views || 0).toLocaleString()}</div><div class="um-stat-l">Total Views</div></div>
          <div class="um-stat"><div class="um-stat-n">${(u.total_likes || 0).toLocaleString()}</div><div class="um-stat-l">Appreciations</div></div>
          <div class="um-stat"><div class="um-stat-n">${u.proj_count || 0}</div><div class="um-stat-l">Projects</div></div>
          <div class="um-stat"><div class="um-stat-n">${u.follower_count || 0}</div><div class="um-stat-l">Followers</div></div>
        </div>
        <div class="um-actions">
          <button class="wm-btn-primary" onclick="openMessageModal(${u.id},'${(u.full_name||'').replace(/'/g,"\\'")}')">📧 Send Message</button>
          ${State.user && State.user.id !== u.id
            ? `<button class="wm-btn-secondary ${u.is_following ? 'following' : ''}" id="followBtn-${u.id}" onclick="toggleFollow(${u.id},'${(u.full_name||'').replace(/'/g,"\\'")}')">
                ${u.is_following ? '✓ Following' : '+ Follow'}
               </button>`
            : ''}
        </div>
        ${u.skills ? `<div class="um-skills-row">${u.skills.split(',').filter(Boolean).map(s => `<span class="wm-skill">${s.trim()}</span>`).join('')}</div>` : ''}
        <div class="um-tab-bar"><button class="um-tab active">Work (${u.proj_count || 0})</button></div>
        <div class="um-projects-grid">
          ${u.projects && u.projects.length
            ? u.projects.map(p => `
              <div class="um-proj-thumb" onclick="closeUserModal();openProjectModal(${p.id})">
                <div class="um-proj-vis" style="background:${gradientForId(p.id)}">
                  ${p.cover_image ? `<img src="${p.cover_image}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;"/>` : `<span style="font-size:2.5rem;position:relative;z-index:1">${categoryEmoji(p.category)}</span>`}
                </div>
                <div class="um-proj-info"><div class="um-proj-title">${p.title}</div><div class="um-proj-likes">❤️ ${p.likes_count || 0}</div></div>
              </div>`).join('')
            : `<p style="color:var(--text3);grid-column:1/-1;padding:20px;font-size:.82rem">No projects yet</p>`
          }
        </div>
        ${u.github || u.linkedin || u.website ? `
          <div class="um-social-links">
            ${u.github ? `<a href="${u.github}" target="_blank" class="um-social-btn">🐙 GitHub</a>` : ''}
            ${u.linkedin ? `<a href="${u.linkedin}" target="_blank" class="um-social-btn">💼 LinkedIn</a>` : ''}
            ${u.website ? `<a href="${u.website}" target="_blank" class="um-social-btn">🌐 Website</a>` : ''}
          </div>` : ''}
      </div>`;
  } catch (err) {
    inner.innerHTML = `<button class="wm-close" onclick="closeUserModal()">✕</button><div style="padding:40px;text-align:center;color:var(--text2)">Failed to load profile. ${err.message}</div>`;
  }
}

function closeUserModal() { document.getElementById('userModal')?.classList.remove('open'); }

async function toggleFollow(userId, name) {
  if (!State.user) { toast('Please log in', 'warn'); return; }
  try {
    const { following } = await API.post(`/users/${userId}/follow`);
    const btn = document.getElementById(`followBtn-${userId}`);
    if (btn) { btn.textContent = following ? '✓ Following' : '+ Follow'; btn.classList.toggle('following', following); }
    toast(following ? `Following ${name}!` : `Unfollowed ${name}`);
  } catch (err) { toast(err.message, 'error'); }
}

// ============================================================
// PROFILE PAGE
// ============================================================
async function loadProfile() {
  if (!State.user) return;
  const container = document.getElementById('profileContainer');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner" style="margin:60px auto"></div>`;
  try {
    const u = await API.get('/users/' + State.user.username);
    renderOwnProfile(u);
  } catch {
    container.innerHTML = `<div class="error-state">Failed to load profile.<button onclick="loadProfile()">Retry</button></div>`;
  }
}

function renderOwnProfile(u) {
  const color = avColor(u.id);
  const initials = (u.full_name || u.username || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const container = document.getElementById('profileContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="profile-cover" style="${u.cover_photo ? 'background-image:url(' + u.cover_photo + ');background-size:cover;background-position:center' : ''}">
      <div class="profile-cover-fx"></div>
      <button class="profile-cover-edit-btn" onclick="document.getElementById('coverInput').click()">✏️ Edit Cover</button>
      <input type="file" id="coverInput" style="display:none" accept="image/*" onchange="uploadCover(this)"/>
    </div>
    <div class="profile-main-bg">
      <div class="profile-row">
        <div class="profile-av-wrap">
          <div class="profile-av" style="background:${color};overflow:hidden">
            ${u.avatar ? `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"/>` : `<span>${initials}</span>`}
          </div>
          <div class="profile-cam" onclick="document.getElementById('avatarInput').click()">📷</div>
          <input type="file" id="avatarInput" style="display:none" accept="image/*" onchange="uploadAvatar(this)"/>
        </div>
        <div class="profile-info">
          <div class="profile-name">${u.full_name || u.username} ${u.is_pro ? '<span class="pro-badge">PRO</span>' : ''}</div>
          <div class="profile-handle">@${u.username}</div>
          <div class="profile-bio">${u.headline || 'Add a headline in Settings'}</div>
          ${u.location ? `<div style="font-size:.77rem;color:var(--text3);margin-top:4px">📍 ${u.location}</div>` : ''}
        </div>
        <div class="profile-act-row">
          <button class="btn-ghost-sm" onclick="switchTab('settings')">✏️ Edit Profile</button>
          <button class="btn-accent-sm" onclick="copyProfileLink('${u.username}')">🔗 Share</button>
        </div>
      </div>
      <div class="profile-stats-bar">
        <div class="ps-item"><div class="ps-n">${(u.total_views || 0).toLocaleString()}</div><div class="ps-l">VIEWS</div></div>
        <div class="ps-item"><div class="ps-n">${(u.total_likes || 0).toLocaleString()}</div><div class="ps-l">APPRECIATIONS</div></div>
        <div class="ps-item"><div class="ps-n">${u.proj_count || 0}</div><div class="ps-l">PROJECTS</div></div>
        <div class="ps-item"><div class="ps-n">${u.follower_count || 0}</div><div class="ps-l">FOLLOWERS</div></div>
        <div class="ps-item"><div class="ps-n">${u.following_count || 0}</div><div class="ps-l">FOLLOWING</div></div>
      </div>
      <div class="profile-tabs-nav">
        <button class="ptab active">Work</button>
        <button class="ptab">About</button>
        <button class="ptab">Saved</button>
      </div>
    </div>
    <div class="profile-work-grid">
      ${u.projects && u.projects.length
        ? u.projects.map(p => projectCardHTML(p, true)).join('')
        : `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📂</div><p>No projects yet</p><button class="btn-accent-sm" onclick="openUploadModal()">Upload Your First Project</button></div>`
      }
    </div>`;

  document.querySelectorAll('.ptab').forEach(t => t.addEventListener('click', function () {
    document.querySelectorAll('.ptab').forEach(x => x.classList.remove('active'));
    this.classList.add('active');
    if (this.textContent === 'Saved') switchTab('saved');
  }));
}

function copyProfileLink(username) {
  navigator.clipboard.writeText(`${location.origin}/profile/${username}`).then(() => toast('Portfolio link copied! 🔗')).catch(() => toast('Could not copy link', 'warn'));
}

async function uploadAvatar(input) {
  if (!input.files[0]) return;
  const fd = new FormData();
  fd.append('avatar', input.files[0]);
  try {
    await API.putForm('/users/me/update', fd);
    toast('Avatar updated!');
    const user = await API.get('/auth/me');
    State.setUser(user);
    updateNavForUser();
    loadProfile();
  } catch (err) { toast(err.message, 'error'); }
}

async function uploadCover(input) {
  if (!input.files[0]) return;
  const fd = new FormData();
  fd.append('cover', input.files[0]);
  try {
    await API.putForm('/users/me/update', fd);
    toast('Cover photo updated!');
    loadProfile();
  } catch (err) { toast(err.message, 'error'); }
}

// ============================================================
// NOTIFICATIONS
// ============================================================
async function loadNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;
  list.innerHTML = `<div class="loading-spinner"></div>`;
  try {
    const { notifications, unread } = await API.get('/notifications');
    State.notifCount = unread || 0;
    if (!notifications || !notifications.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><p>No notifications yet</p></div>`;
      return;
    }
    const icons = { like: '❤️', comment: '💬', follow: '👥', view: '👁', job_match: '💼', system: '🔔' };
    list.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}">
        <div class="notif-icon">${icons[n.type] || '🔔'}</div>
        <div class="notif-content">
          <div class="notif-text">${n.message}</div>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
      </div>`).join('');
  } catch { list.innerHTML = `<div class="error-state">Failed to load notifications</div>`; }
}

async function markAllNotifsRead() {
  try {
    await API.put('/notifications/read-all');
    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    document.querySelectorAll('.notif-dot').forEach(d => d.style.display = 'none');
    State.notifCount = 0;
    toast('All notifications marked as read');
  } catch {}
}

// ============================================================
// SAVED
// ============================================================
async function loadSaved() {
  const grid = document.getElementById('savedGrid');
  if (!grid) return;
  grid.innerHTML = `<div class="loading-spinner"></div>`;
  try {
    const projects = await API.get('/saved');
    if (!projects || !projects.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">💾</div><p>No saved projects yet</p><button class="btn-accent-sm" onclick="switchTab('explore')">Browse Projects</button></div>`;
      return;
    }
    grid.innerHTML = projects.map(p => exploreCardHTML(p)).join('');
  } catch { grid.innerHTML = `<div class="error-state" style="grid-column:1/-1">Failed to load saved projects</div>`; }
}

// ============================================================
// SETTINGS
// ============================================================
async function loadSettings() {
  if (!State.user) return;
  const u = State.user;
  const fields = {
    'set-full_name': u.full_name || '', 'set-headline': u.headline || '',
    'set-bio': u.bio || '', 'set-location': u.location || '',
    'set-website': u.website || '', 'set-github': u.github || '',
    'set-linkedin': u.linkedin || '', 'set-twitter': u.twitter || '',
    'set-skills': u.skills || '',
  };
  Object.entries(fields).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });
  const wt = document.getElementById('set-worktype');
  if (wt) wt.value = u.work_type || 'both';
  const av = document.getElementById('set-available');
  if (av) av.checked = !!u.is_available;
  const sa = document.getElementById('settingsAv');
  if (sa) {
    const initials = (u.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    if (u.avatar) sa.innerHTML = `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:13px;"/>`;
    else { sa.style.background = `linear-gradient(135deg,${avColor(u.id)},${avColor(u.id)}aa)`; sa.textContent = initials; }
  }
}

async function saveProfileSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('saveProfileBtn');
  if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }
  const fd = new FormData();
  const fields = ['full_name', 'headline', 'bio', 'location', 'website', 'github', 'linkedin', 'twitter', 'skills'];
  fields.forEach(f => { const el = document.getElementById('set-' + f.replace('_', '-')); if (el) fd.append(f, el.value); });
  fd.append('work_type', document.getElementById('set-worktype')?.value || 'both');
  fd.append('is_available', document.getElementById('set-available')?.checked ? '1' : '0');
  try {
    await API.putForm('/users/me/update', fd);
    const user = await API.get('/auth/me');
    State.setUser(user);
    updateNavForUser();
    toast('✅ Profile saved successfully!');
  } catch (err) { toast(err.message, 'error'); }
  finally { if (btn) { btn.textContent = 'Save Changes'; btn.disabled = false; } }
}

async function savePassword(e) {
  e.preventDefault();
  const curr = document.getElementById('set-curr-pass')?.value;
  const newp = document.getElementById('set-new-pass')?.value;
  const conf = document.getElementById('set-conf-pass')?.value;
  if (!curr || !newp) return toast('Please fill all password fields', 'error');
  if (newp !== conf) return toast('Passwords do not match', 'error');
  if (newp.length < 6) return toast('Password must be at least 6 characters', 'error');
  try {
    await API.put('/users/me/password', { current_password: curr, new_password: newp });
    toast('✅ Password changed!');
    ['set-curr-pass', 'set-new-pass', 'set-conf-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  } catch (err) { toast(err.message, 'error'); }
}

function switchSettingsPanel(name, el) {
  document.querySelectorAll('.s-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sn-item').forEach(i => i.classList.remove('active'));
  const panel = document.getElementById('sp-' + name);
  if (panel) panel.classList.add('active');
  if (el) el.classList.add('active');
  if (name === 'profile') loadSettings();
}

// ============================================================
// UPLOAD MODAL
// ============================================================
function openUploadModal() {
  if (!State.user) { toast('Please log in to upload projects', 'warn'); showPage('login'); return; }
  document.getElementById('uploadModal')?.classList.add('open');
}
function closeUploadModal() { document.getElementById('uploadModal')?.classList.remove('open'); }

async function handleUpload(e) {
  if (e && e.preventDefault) e.preventDefault();
  const btn = document.getElementById('uploadBtn');
  const titleEl = document.getElementById('projTitle');
  if (!titleEl || !titleEl.value.trim()) return toast('Project title is required', 'error');
  if (btn) { btn.textContent = 'Publishing...'; btn.disabled = true; }
  try {
    const form = document.getElementById('uploadForm');
    const fd = new FormData(form);
    await API.postForm('/projects', fd);
    toast('🚀 Project published successfully!');
    closeUploadModal();
    if (form) form.reset();
    const pg = document.getElementById('previewGrid');
    if (pg) { pg.innerHTML = ''; pg.style.display = 'none'; }
    if (document.getElementById('sub-dashboard')?.classList.contains('active')) loadDashboard();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    if (btn) { btn.textContent = 'Publish Project →'; btn.disabled = false; }
  }
}

function handleFilePreview(input) {
  const pg = document.getElementById('previewGrid');
  if (!pg) return;
  pg.style.display = 'grid';
  pg.innerHTML = '';
  Array.from(input.files).forEach(f => {
    const div = document.createElement('div');
    div.className = 'preview-item';
    if (f.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      div.appendChild(img);
    } else div.textContent = '📄';
    pg.appendChild(div);
  });
}

function setupDragDrop() {
  const dz = document.getElementById('dropzone');
  if (!dz) return;
  ['dragover', 'dragenter'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.add('drag-over'); }));
  ['dragleave', 'dragend'].forEach(e => dz.addEventListener(e, () => dz.classList.remove('drag-over')));
  dz.addEventListener('drop', ev => {
    ev.preventDefault(); dz.classList.remove('drag-over');
    const dt = new DataTransfer();
    Array.from(ev.dataTransfer.files).forEach(f => dt.items.add(f));
    const input = document.getElementById('projImages');
    if (input) { input.files = dt.files; handleFilePreview(input); }
  });
}

// ============================================================
// MESSAGE MODAL
// ============================================================
function openMessageModal(userId, name) {
  if (!State.user) { toast('Please log in to send messages', 'warn'); return; }
  const rid = document.getElementById('msgReceiverId');
  const rname = document.getElementById('msgReceiverName');
  if (rid) rid.value = userId;
  if (rname) rname.textContent = name;
  document.getElementById('messageModal')?.classList.add('open');
}
function closeMessageModal() { document.getElementById('messageModal')?.classList.remove('open'); }

async function handleSendMessage(e) {
  e.preventDefault();
  const btn = document.getElementById('msgBtn');
  const receiver_id = document.getElementById('msgReceiverId')?.value;
  const subject = document.getElementById('msgSubject')?.value;
  const content = document.getElementById('msgContent')?.value;
  if (!content || !content.trim()) return toast('Message cannot be empty', 'error');
  if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }
  try {
    await API.post('/messages', { receiver_id, subject, content });
    toast('📧 Message sent successfully!');
    closeMessageModal();
    const sub = document.getElementById('msgSubject');
    const con = document.getElementById('msgContent');
    if (sub) sub.value = '';
    if (con) con.value = '';
  } catch (err) { toast(err.message, 'error'); }
  finally { if (btn) { btn.textContent = 'Send Message'; btn.disabled = false; } }
}

// ============================================================
// PRO UPGRADE — Working modal
// ============================================================
function openProModal() {
  const overlay = document.getElementById('proModal');
  if (overlay) overlay.classList.add('open');
}
function closeProModal() {
  const overlay = document.getElementById('proModal');
  if (overlay) overlay.classList.remove('open');
}
async function handleProUpgrade(plan) {
  if (!State.user) { toast('Please log in first', 'warn'); return; }
  toast(`🎉 Redirecting to ${plan} checkout...`);
  setTimeout(() => {
    closeProModal();
    toast('Payment integration — connect Stripe in .env to activate', 'warn');
  }, 1500);
}

// ============================================================
// POST JOB
// ============================================================
function openPostJobModal() {
  if (!State.user) { toast('Please log in to post jobs', 'warn'); return; }
  document.getElementById('postJobModal')?.classList.add('open');
}
function closePostJobModal() { document.getElementById('postJobModal')?.classList.remove('open'); }

async function handlePostJob(e) {
  e.preventDefault();
  const btn = document.getElementById('postJobBtn');
  if (btn) { btn.textContent = 'Posting...'; btn.disabled = true; }
  try {
    await API.post('/jobs', {
      title: document.getElementById('jobTitle')?.value,
      description: document.getElementById('jobDesc')?.value,
      category: document.getElementById('jobCategory')?.value,
      job_type: document.getElementById('jobType')?.value,
      location: document.getElementById('jobLocation')?.value,
      skills_required: document.getElementById('jobSkills')?.value,
    });
    toast('✅ Job posted successfully!');
    closePostJobModal();
    if (e.target) e.target.reset();
  } catch (err) { toast(err.message, 'error'); }
  finally { if (btn) { btn.textContent = 'Post Job →'; btn.disabled = false; } }
}
