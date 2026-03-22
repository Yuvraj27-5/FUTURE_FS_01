const router = require('express').Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// ─── NOTIFICATIONS ────────────────────────────
// GET /api/notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT n.*, u.username, u.full_name, u.avatar FROM notifications n
      LEFT JOIN users u ON n.from_user=u.id
      WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 30`, [req.user.id]);
    const [unread] = await db.query('SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND is_read=0', [req.user.id]);
    res.json({ notifications: rows, unread: unread[0].c });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MESSAGES ────────────────────────────────
// GET /api/messages
router.get('/messages', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, u.username, u.full_name, u.avatar FROM messages m
      JOIN users u ON m.sender_id=u.id
      WHERE m.receiver_id=? ORDER BY m.created_at DESC LIMIT 30`, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages - Send message/inquiry
router.post('/messages', auth, async (req, res) => {
  try {
    const { receiver_id, subject, content } = req.body;
    if (!receiver_id || !content) return res.status(400).json({ error: 'Receiver and content required' });
    await db.query('INSERT INTO messages (sender_id, receiver_id, subject, content) VALUES (?,?,?,?)',
      [req.user.id, receiver_id, subject||'Inquiry from FolioHub', content]);
    // Notify receiver
    await db.query('INSERT INTO notifications (user_id, from_user, type, message) VALUES (?,?,?,?)',
      [receiver_id, req.user.id, 'system', `${req.user.username} sent you a message: "${subject||'New inquiry'}"`]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── JOBS ─────────────────────────────────────
// GET /api/jobs
router.get('/jobs', async (req, res) => {
  try {
    const { search='', category='', location='', job_type='', sort='recent', page=1, limit=10 } = req.query;
    const offset = (parseInt(page)-1) * parseInt(limit);
    let where = ["j.status='open'"];
    let params = [];
    if (search) { where.push('(j.title LIKE ? OR j.description LIKE ?)'); const s=`%${search}%`; params.push(s,s); }
    if (category) { where.push('j.category LIKE ?'); params.push(`%${category}%`); }
    if (location) { where.push('j.location LIKE ?'); params.push(`%${location}%`); }
    if (job_type) { where.push('j.job_type=?'); params.push(job_type); }

    const [rows] = await db.query(`
      SELECT j.*, u.username, u.full_name, u.avatar FROM jobs j
      JOIN users u ON j.poster_id=u.id
      WHERE ${where.join(' AND ')} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]);
    const [count] = await db.query(`SELECT COUNT(*) AS c FROM jobs j JOIN users u ON j.poster_id=u.id WHERE ${where.join(' AND ')}`, params);
    res.json({ jobs: rows, total: count[0].c });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs - Post a job
router.post('/jobs', auth, async (req, res) => {
  try {
    const { title, description, category, location, job_type, budget_min, budget_max, skills_required } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const [r] = await db.query(
      'INSERT INTO jobs (poster_id,title,description,category,location,job_type,budget_min,budget_max,skills_required) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.user.id, title, description, category, location, job_type||'remote', budget_min||null, budget_max||null, skills_required]);
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/saved - Get saved projects
router.get('/saved', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, u.username, u.full_name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE project_id=p.id) AS likes_count
      FROM saved_projects sp JOIN projects p ON sp.project_id=p.id
      JOIN users u ON p.user_id=u.id
      WHERE sp.user_id=? ORDER BY sp.created_at DESC`, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
