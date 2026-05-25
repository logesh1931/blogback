const router  = require('express').Router();
const { body, validationResult } = require('express-validator');
const Post    = require('../models/Post');
const Comment = require('../models/Comment');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// GET /api/posts
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.author)   filter.author   = req.query.author;

    const posts = await Post.find(filter)
      .populate('author', 'name avatar_url')
      .sort({ createdAt: -1 })
      .lean();

    // Attach comment counts
    const ids = posts.map(p => p._id);
    const counts = await Comment.aggregate([
      { $match: { post: { $in: ids } } },
      { $group: { _id: '$post', count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));
    posts.forEach(p => { p.comment_count = countMap[p._id.toString()] || 0; });

    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name bio avatar_url')
      .lean();
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'name avatar_url')
      .sort({ createdAt: 1 })
      .lean();

    res.json({ post, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts
router.post('/', requireAuth, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('body').trim().notEmpty().withMessage('Content required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    const post = await Post.create({
      title:    req.body.title,
      body:     req.body.body,
      category: req.body.category || 'general',
      author:   req.user.id,
    });
    await post.populate('author', 'name avatar_url');
    res.status(201).json({ post: { ...post.toJSON(), comment_count: 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/posts/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const { title, body, category } = req.body;
    if (title)    post.title    = title;
    if (body)     post.body     = body;
    if (category) post.category = category;
    await post.save();
    await post.populate('author', 'name avatar_url');

    res.json({ post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    await Promise.all([
      post.deleteOne(),
      Comment.deleteMany({ post: req.params.id }),
    ]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
