const router = require('express').Router();
const db = require('../config/db');
const { auth, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5*1024*1024 }, fileFilter: (req,file,cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images'));
}});

// GET /api/users - Browse users/freelancers with filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search='', location='', work_type='', skills='', sort='recent', page=1, limit=12 } = req.query;
    const offset = (parseInt(page)-1) * parseInt(limit);
    let where = ['1=1'];
    let params = [];

    if (search) {
      where.push('(u.full_name LIKE ? OR u.username LIKE ? OR u.headline LIKE ? OR u.skills LIKE ?)');
      const s = `%${search}%`;
      params.push(s,s,s,s);
    }
    if (location) { where.push('u.location LIKE ?'); params.push(`%${location}%`); }
    if (work_type) { where.push('u.work_type=?'); params.push(work_type); }
    if (skills) { where.push('u.skills LIKE ?'); params.push(`%${skills}%`); }

    const orderMap = { recent:'u.created_at DESC', popular:'proj_count DESC', pro:'u.is_pro DESC, u.created_at DESC' };
    const order = orderMap[sort] || 'u.created_at DESC';

    const sql = `
      SELECT u.id, u.username, u.full_name, u.headline, u.bio, u.avatar, u.location, u.is_pro, u.work_type, u.skills, u.is_available, u.created_at,
        (SELECT COUNT(*) FROM projects WHERE user_id=u.id AND is_published=1) AS proj_count,
        (SELECT COUNT(*) FROM follows WHERE following_id=u.id) AS follower_count,
        (SELECT COUNT(*) FROM messages WHERE receiver_id=u.id) AS job_count
        ${req.user ? ', (SELECT COUNT(*) FROM follows WHERE follower_id=? AND following_id=u.id) AS is_following' : ', 0 AS is_following'}
      FROM users u WHERE ${where.join(' AND ')}
      ORDER BY ${order} LIMIT ? OFFSET ?`;

    let qParams = req.user ? [req.user.id, ...params, parseInt(limit), offset] : [...params, parseInt(limit), offset];
    const [rows] = await db.query(sql, qParams);
    const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM users u WHERE ${where.join(' AND ')}`, params);

    res.json({ users: rows, total: countRows[0].total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:username - Public profile
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username, u.full_name, u.headline, u.bio, u.avatar, u.cover_photo, u.location, u.website, u.github, u.linkedin, u.twitter, u.is_pro, u.work_type, u.skills, u.is_available, u.created_at,
        (SELECT COUNT(*) FROM projects WHERE user_id=u.id AND is_published=1) AS proj_count,
        (SELECT COUNT(*) FROM follows WHERE following_id=u.id) AS follower_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id=u.id) AS following_count,
        (SELECT COALESCE(SUM(views),0) FROM projects WHERE user_id=u.id) AS total_views,
        (SELECT COUNT(*) FROM likes l JOIN projects p ON l.project_id=p.id WHERE p.user_id=u.id) AS total_likes
        ${req.user ? ', (SELECT COUNT(*) FROM follows WHERE follower_id=? AND following_id=u.id) AS is_following' : ', 0 AS is_following'}
      FROM users u WHERE u.username=?`,
      req.user ? [req.user.id, req.params.username] : [req.params.username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const user = rows[0];
    // Record profile view
    if (req.user && req.user.id !== user.id) {
      await db.query('INSERT INTO profile_views (profile_id, viewer_id) VALUES (?,?)', [user.id, req.user.id]);
    }

    const [projects] = await db.query(`
      SELECT p.*, (SELECT COUNT(*) FROM likes WHERE project_id=p.id) AS likes_count
      FROM projects p WHERE p.user_id=? AND p.is_published=1
      ORDER BY p.created_at DESC LIMIT 20`, [user.id]);

    res.json({ ...user, projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/me - Update profile
router.put('/me/update', auth, upload.fields([{name:'avatar',maxCount:1},{name:'cover',maxCount:1}]), async (req, res) => {
  try {
    const { full_name, headline, bio, location, website, github, linkedin, twitter, skills, work_type, is_available } = req.body;
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (headline !== undefined) updates.headline = headline;
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;
    if (website !== undefined) updates.website = website;
    if (github !== undefined) updates.github = github;
    if (linkedin !== undefined) updates.linkedin = linkedin;
    if (twitter !== undefined) updates.twitter = twitter;
    if (skills !== undefined) updates.skills = skills;
    if (work_type !== undefined) updates.work_type = work_type;
    if (is_available !== undefined) updates.is_available = is_available === 'true' || is_available === '1' || is_available === true;
    if (req.files?.avatar) updates.avatar = '/uploads/avatars/' + req.files.avatar[0].filename;
    if (req.files?.cover) updates.cover_photo = '/uploads/avatars/' + req.files.cover[0].filename;

    if (Object.keys(updates).length === 0) return res.json({ success: true });
    const keys = Object.keys(updates).map(k=>`${k}=?`).join(',');
    await db.query(`UPDATE users SET ${keys} WHERE id=?`, [...Object.values(updates), req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/follow - Toggle follow
router.post('/:id/follow', auth, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });
    const [ex] = await db.query('SELECT id FROM follows WHERE follower_id=? AND following_id=?', [req.user.id, req.params.id]);
    if (ex.length) {
      await db.query('DELETE FROM follows WHERE follower_id=? AND following_id=?', [req.user.id, req.params.id]);
      res.json({ following: false });
    } else {
      await db.query('INSERT INTO follows (follower_id, following_id) VALUES (?,?)', [req.user.id, req.params.id]);
      await db.query('INSERT INTO notifications (user_id, from_user, type, message) VALUES (?,?,?,?)',
        [req.params.id, req.user.id, 'follow', `${req.user.username} started following you`]);
      res.json({ following: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/me/stats - Dashboard stats
router.get('/me/stats', auth, async (req, res) => {
  try {
    const [views] = await db.query('SELECT COUNT(*) AS c FROM profile_views WHERE profile_id=?', [req.user.id]);
    const [likes] = await db.query('SELECT COUNT(*) AS c FROM likes l JOIN projects p ON l.project_id=p.id WHERE p.user_id=?', [req.user.id]);
    const [projects] = await db.query('SELECT COUNT(*) AS c FROM projects WHERE user_id=? AND is_published=1', [req.user.id]);
    const [followers] = await db.query('SELECT COUNT(*) AS c FROM follows WHERE following_id=?', [req.user.id]);
    const [recruiterViews] = await db.query('SELECT COUNT(*) AS c FROM profile_views WHERE profile_id=? AND viewed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)', [req.user.id]);
    // Weekly views chart data
    const [weeklyViews] = await db.query(`
      SELECT DATE(viewed_at) AS date, COUNT(*) AS count FROM profile_views
      WHERE profile_id=? AND viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(viewed_at) ORDER BY date`, [req.user.id]);
    res.json({
      profile_views: views[0].c,
      total_likes: likes[0].c,
      projects: projects[0].c,
      followers: followers[0].c,
      recruiter_views: recruiterViews[0].c,
      weekly_views: weeklyViews
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/me/password
router.put('/me/password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const [rows] = await db.query('SELECT password FROM users WHERE id=?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password=? WHERE id=?', [hashed, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
