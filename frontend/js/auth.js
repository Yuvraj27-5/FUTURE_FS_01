// ============================================================
// Auth Module
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
  const initials = u.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  document.querySelectorAll('.user-av').forEach(el => {
    if (u.avatar) el.innerHTML = `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:9px;" onerror="this.parentElement.textContent='${initials}'"/>`;
    else el.textContent = initials;
  });
  document.querySelectorAll('.user-dd-name').forEach(el => el.textContent = u.full_name);
  document.querySelectorAll('.user-dd-email').forEach(el => el.textContent = u.email);
  loadNotifBadge();
}

// ─── LOGIN ────────────────────────────────────
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

// ─── REGISTER ─────────────────────────────────
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
    toast(`Account created! Welcome to FolioHub, ${user.full_name.split(' ')[0]}! 🎉`);
    showApp('dashboard');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.textContent = 'Create Free Account →'; btn.disabled = false;
  }
}

// ─── LOGOUT ───────────────────────────────────
async function handleLogout() {
  try {
    await API.post('/auth/logout');
    State.clearUser();
    toast('Logged out successfully');
    showPage('landing');
  } catch {
    State.clearUser();
    showPage('landing');
  }
}

// ─── NOTIF BADGE ─────────────────────────────
async function loadNotifBadge() {
  try {
    const { unread } = await API.get('/notifications');
    State.notifCount = unread;
    document.querySelectorAll('.notif-dot').forEach(d => {
      d.style.display = unread > 0 ? 'block' : 'none';
    });
  } catch {}
}
