const router  = require('express').Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Post    = require('../models/Post');
const { requireAuth } = require('../middleware/auth');

// GET /api/posts/:postId/comments
router.get('/', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'name avatar_url')
      .sort({ createdAt: 1 });
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:postId/comments
router.post('/', requireAuth, [
  body('body').trim().notEmpty().withMessage('Comment cannot be empty'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = await Comment.create({
      body:   req.body.body,
      post:   req.params.postId,
      author: req.user.id,
    });
    await comment.populate('author', 'name avatar_url');
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/posts/:postId/comments/:id
router.patch('/:id', requireAuth, [
  body('body').trim().notEmpty(),
], async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, post: req.params.postId });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    comment.body = req.body.body;
    await comment.save();
    await comment.populate('author', 'name avatar_url');
    res.json({ comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:postId/comments/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, post: req.params.postId });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
