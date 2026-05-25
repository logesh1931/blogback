const router = require('express').Router();
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const VALID_CATEGORIES = ['craft','design','technology','lifestyle','culture','personal','other','general'];

// GET /api/posts  — list all posts (newest first), with author & comment count
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, author } = req.query;
    let qry = `
      SELECT
        p.id, p.title, p.body, p.category, p.created_at, p.updated_at,
        u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar,
        COUNT(c.id)::int AS comment_count
      FROM posts p
      JOIN users u ON u.id = p.author_id
      LEFT JOIN comments c ON c.post_id = p.id
    `;
    const params = [];
    const where = [];
    if (category) { params.push(category); where.push(`p.category=$${params.length}`); }
    if (author)   { params.push(author);   where.push(`p.author_id=$${params.length}`); }
    if (where.length) qry += ' WHERE ' + where.join(' AND ');
    qry += ' GROUP BY p.id, u.id ORDER BY p.created_at DESC';

    const { rows } = await pool.query(qry, params);
    res.json({ posts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/:id — single post with comments
router.get('/:id', optionalAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: postRows } = await pool.query(`
      SELECT
        p.id, p.title, p.body, p.category, p.created_at, p.updated_at,
        u.id AS author_id, u.name AS author_name, u.bio AS author_bio, u.avatar_url AS author_avatar
      FROM posts p
      JOIN users u ON u.id = p.author_id
      WHERE p.id=$1
    `, [id]);

    if (postRows.length === 0) return res.status(404).json({ error: 'Post not found' });

    const { rows: comments } = await pool.query(`
      SELECT c.id, c.body, c.created_at, c.updated_at,
             u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.post_id=$1
      ORDER BY c.created_at ASC
    `, [id]);

    res.json({ post: postRows[0], comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts — create post
router.post('/', requireAuth, [
  body('title').trim().notEmpty().withMessage('Title required').isLength({ max: 200 }),
  body('body').trim().notEmpty().withMessage('Content required'),
  body('category').optional().isIn(VALID_CATEGORIES),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { title, body: postBody, category = 'general' } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO posts (title, body, category, author_id)
      VALUES ($1,$2,$3,$4)
      RETURNING id, title, body, category, author_id, created_at, updated_at
    `, [title, postBody, category, req.user.id]);

    const post = rows[0];
    // Attach author info
    const { rows: userRows } = await pool.query(
      'SELECT name, avatar_url FROM users WHERE id=$1', [req.user.id]
    );
    post.author_name = userRows[0].name;
    post.author_avatar = userRows[0].avatar_url;
    post.comment_count = 0;

    res.status(201).json({ post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/posts/:id — update post (owner only)
router.patch('/:id', requireAuth, [
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('body').optional().trim().notEmpty(),
  body('category').optional().isIn(VALID_CATEGORIES),
], async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: existing } = await pool.query('SELECT author_id FROM posts WHERE id=$1', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Post not found' });
    if (existing[0].author_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const { title, body: postBody, category } = req.body;
    const { rows } = await pool.query(`
      UPDATE posts SET
        title    = COALESCE($1, title),
        body     = COALESCE($2, body),
        category = COALESCE($3, category),
        updated_at = NOW()
      WHERE id=$4
      RETURNING id, title, body, category, author_id, created_at, updated_at
    `, [title || null, postBody || null, category || null, id]);

    res.json({ post: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posts/:id — delete post (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT author_id FROM posts WHERE id=$1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    if (rows[0].author_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    await pool.query('DELETE FROM posts WHERE id=$1', [id]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
