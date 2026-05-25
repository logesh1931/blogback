const router = require('express').Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// GET /api/posts/:postId/comments
router.get('/', async (req, res) => {
  const { postId } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.body, c.created_at, c.updated_at,
             u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.post_id=$1
      ORDER BY c.created_at ASC
    `, [postId]);
    res.json({ comments: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:postId/comments
router.post('/', requireAuth, [
  body('body').trim().notEmpty().withMessage('Comment cannot be empty'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { postId } = req.params;
  const { body: commentBody } = req.body;
  try {
    // Verify post exists
    const { rows: postCheck } = await pool.query('SELECT id FROM posts WHERE id=$1', [postId]);
    if (postCheck.length === 0) return res.status(404).json({ error: 'Post not found' });

    const { rows } = await pool.query(`
      INSERT INTO comments (body, post_id, author_id)
      VALUES ($1,$2,$3)
      RETURNING id, body, post_id, author_id, created_at, updated_at
    `, [commentBody, postId, req.user.id]);

    const comment = rows[0];
    // Attach author
    const { rows: userRows } = await pool.query(
      'SELECT name, avatar_url FROM users WHERE id=$1', [req.user.id]
    );
    comment.author_name = userRows[0].name;
    comment.author_avatar = userRows[0].avatar_url;

    res.status(201).json({ comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/posts/:postId/comments/:id
router.patch('/:id', requireAuth, [
  body('body').trim().notEmpty(),
], async (req, res) => {
  const { id, postId } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT author_id FROM comments WHERE id=$1 AND post_id=$2', [id, postId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    if (rows[0].author_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const { rows: updated } = await pool.query(`
      UPDATE comments SET body=$1, updated_at=NOW() WHERE id=$2
      RETURNING id, body, post_id, author_id, created_at, updated_at
    `, [req.body.body, id]);

    res.json({ comment: updated[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posts/:postId/comments/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { id, postId } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT author_id FROM comments WHERE id=$1 AND post_id=$2', [id, postId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    if (rows[0].author_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    await pool.query('DELETE FROM comments WHERE id=$1', [id]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
