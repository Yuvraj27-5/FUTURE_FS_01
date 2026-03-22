const router = require('express').Router();
const db = require('../config/db');
const { auth, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/projects');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10*1024*1024 }, fileFilter: (req,file,cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images allowed'));
}});

// GET /api/projects - List with filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search='', category='', location='', work_type='', sort='recent', page=1, limit=20, featured } = req.query;
    const offset = (parseInt(page)-1) * parseInt(limit);
    let where = ['p.is_published=1'];
    let params = [];

    if (search) {
      where.push('(p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR u.full_name LIKE ?)');
      const s = `%${search}%`;
      params.push(s,s,s,s);
    }
    if (category) { where.push('p.category=?'); params.push(category); }
    if (location) { where.push('u.location LIKE ?'); params.push(`%${location}%`); }
    if (work_type) { where.push('u.work_type=?'); params.push(work_type); }
    if (featured==='1') { where.push('p.featured=1'); }

    const orderMap = { recent:'p.created_at DESC', popular:'likes_count DESC', views:'p.views DESC', oldest:'p.created_at ASC' };
    const order = orderMap[sort] || 'p.created_at DESC';

    const whereSQL = where.length ? 'WHERE '+where.join(' AND ') : '';
    const sql = `
      SELECT p.*, u.username, u.full_name, u.avatar, u.location, u.is_pro, u.work_type,
        (SELECT COUNT(*) FROM likes l WHERE l.project_id=p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.project_id=p.id) AS comments_count
        ${req.user ? ', (SELECT COUNT(*) FROM likes WHERE user_id=? AND project_id=p.id) AS user_liked, (SELECT COUNT(*) FROM saved_projects WHERE user_id=? AND project_id=p.id) AS user_saved' : ', 0 AS user_liked, 0 AS user_saved'}
      FROM projects p JOIN users u ON p.user_id=u.id
      ${whereSQL}
      ORDER BY ${order} LIMIT ? OFFSET ?`;

    const countSQL = `SELECT COUNT(*) AS total FROM projects p JOIN users u ON p.user_id=u.id ${whereSQL}`;

    let queryParams = req.user ? [req.user.id, req.user.id, ...params] : [...params];
    queryParams.push(parseInt(limit), offset);

    const [rows] = await db.query(sql, queryParams);
    const [countRows] = await db.query(countSQL, params);

    res.json({ projects: rows, total: countRows[0].total, page: parseInt(page), pages: Math.ceil(countRows[0].total/parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id - Single project
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, u.username, u.full_name, u.avatar, u.headline, u.location, u.is_pro, u.work_type, u.skills,
        (SELECT COUNT(*) FROM likes WHERE project_id=p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE project_id=p.id) AS comments_count
        ${req.user ? ', (SELECT COUNT(*) FROM likes WHERE user_id=? AND project_id=p.id) AS user_liked, (SELECT COUNT(*) FROM saved_projects WHERE user_id=? AND project_id=p.id) AS user_saved' : ', 0 AS user_liked, 0 AS user_saved'}
      FROM projects p JOIN users u ON p.user_id=u.id WHERE p.id=? AND p.is_published=1`,
      req.user ? [req.user.id, req.user.id, req.params.id] : [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });

    // Increment view count
    await db.query('UPDATE projects SET views=views+1 WHERE id=?', [req.params.id]);

    // Get images
    const [images] = await db.query('SELECT * FROM project_images WHERE project_id=? ORDER BY sort_order', [req.params.id]);
    // Get comments
    const [comments] = await db.query(`
      SELECT c.*, u.username, u.full_name, u.avatar FROM comments c
      JOIN users u ON c.user_id=u.id WHERE c.project_id=? ORDER BY c.created_at DESC LIMIT 20`, [req.params.id]);

    res.json({ ...rows[0], images, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects - Create project
router.post('/', auth, upload.array('images', 8), async (req, res) => {
  try {
    const { title, description, category, tags, live_url, github_url } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const [result] = await db.query(
      'INSERT INTO projects (user_id, title, description, category, tags, live_url, github_url) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, title, description||'', category||'Web Development', tags||'', live_url||null, github_url||null]
    );
    const projectId = result.insertId;

    if (req.files?.length > 0) {
      const cover = '/uploads/projects/' + req.files[0].filename;
      await db.query('UPDATE projects SET cover_image=? WHERE id=?', [cover, projectId]);
      for (let i=0; i<req.files.length; i++) {
        await db.query('INSERT INTO project_images (project_id, image_path, sort_order) VALUES (?,?,?)',
          [projectId, '/uploads/projects/'+req.files[i].filename, i]);
      }
    }

    // Notify followers
    const [followers] = await db.query('SELECT follower_id FROM follows WHERE following_id=?', [req.user.id]);
    for (const f of followers) {
      await db.query('INSERT INTO notifications (user_id, from_user, type, message, link) VALUES (?,?,?,?,?)',
        [f.follower_id, req.user.id, 'system', `${req.user.username} published a new project: ${title}`, `/project/${projectId}`]);
    }

    res.status(201).json({ success: true, id: projectId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id FROM projects WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const { title, description, category, tags, live_url, github_url, is_published } = req.body;
    await db.query('UPDATE projects SET title=?,description=?,category=?,tags=?,live_url=?,github_url=?,is_published=? WHERE id=?',
      [title, description, category, tags, live_url||null, github_url||null, is_published!==undefined?is_published:1, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id FROM projects WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await db.query('DELETE FROM projects WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/like - Toggle like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const [existing] = await db.query('SELECT id FROM likes WHERE user_id=? AND project_id=?', [req.user.id, req.params.id]);
    if (existing.length) {
      await db.query('DELETE FROM likes WHERE user_id=? AND project_id=?', [req.user.id, req.params.id]);
      res.json({ liked: false });
    } else {
      await db.query('INSERT INTO likes (user_id, project_id) VALUES (?,?)', [req.user.id, req.params.id]);
      // Notify project owner
      const [proj] = await db.query('SELECT user_id, title FROM projects WHERE id=?', [req.params.id]);
      if (proj.length && proj[0].user_id !== req.user.id) {
        await db.query('INSERT INTO notifications (user_id, from_user, type, message, link) VALUES (?,?,?,?,?)',
          [proj[0].user_id, req.user.id, 'like', `${req.user.username} liked your project "${proj[0].title}"`, `/project/${req.params.id}`]);
      }
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/save - Toggle save
router.post('/:id/save', auth, async (req, res) => {
  try {
    const [existing] = await db.query('SELECT id FROM saved_projects WHERE user_id=? AND project_id=?', [req.user.id, req.params.id]);
    if (existing.length) {
      await db.query('DELETE FROM saved_projects WHERE user_id=? AND project_id=?', [req.user.id, req.params.id]);
      res.json({ saved: false });
    } else {
      await db.query('INSERT INTO saved_projects (user_id, project_id) VALUES (?,?)', [req.user.id, req.params.id]);
      res.json({ saved: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Comment cannot be empty' });
    await db.query('INSERT INTO comments (user_id, project_id, content) VALUES (?,?,?)', [req.user.id, req.params.id, content]);
    const [proj] = await db.query('SELECT user_id, title FROM projects WHERE id=?', [req.params.id]);
    if (proj.length && proj[0].user_id !== req.user.id) {
      await db.query('INSERT INTO notifications (user_id, from_user, type, message, link) VALUES (?,?,?,?,?)',
        [proj[0].user_id, req.user.id, 'comment', `${req.user.username} commented on "${proj[0].title}"`, `/project/${req.params.id}`]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
