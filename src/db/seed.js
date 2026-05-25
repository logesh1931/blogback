require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Post     = require('../models/Post');
const Comment  = require('../models/Comment');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Comment.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create users (password hashed by pre-save hook)
    const [elena, james] = await User.create([
      { name: 'Elena Marsh', email: 'elena@inkwell.com', password: 'demo123', bio: 'Fiction writer & coffee enthusiast' },
      { name: 'James Wolfe', email: 'james@inkwell.com', password: 'demo123', bio: 'Tech journalist covering AI and design' },
    ]);
    console.log('👤 Users created');

    // Create posts
    const [post1, post2, post3] = await Post.create([
      {
        title: 'The Art of Slow Writing',
        category: 'craft',
        author: elena._id,
        body: `Writing, like most creative acts, suffers when rushed. We live in a culture of productivity hacks and word-count goals, but the best prose often emerges from patience — from sitting with an idea until it crystallizes.\n\nI've spent the last year writing more slowly. Not out of laziness, but out of care. Each sentence gets a second look. Each paragraph earns its place. The result isn't less work — it's more intentional work.\n\nTry this: write one paragraph tomorrow. Just one. Make it perfect.`,
      },
      {
        title: 'Why I Deleted All My Productivity Apps',
        category: 'lifestyle',
        author: james._id,
        body: `Six months ago I had fourteen apps promising to make me more productive. Calendar sync, habit trackers, time-blockers, focus timers, smart to-do lists. Each one required onboarding, maintenance, and mental overhead.\n\nThen I tried something radical: a paper notebook and a single daily list.\n\nThe results surprised me. Without the dopamine loop of checking off digital tasks, I started thinking more carefully about what actually mattered. The notebook doesn't ping me. It just holds my thoughts.\n\nSometimes the lowest-tech solution is the highest-leverage one.`,
      },
      {
        title: 'Design Principles I Stole from Architecture',
        category: 'design',
        author: elena._id,
        body: `Buildings have to work. A door that looks beautiful but is hard to open fails. Architecture has centuries of hard-won lessons that digital product designers often ignore.\n\nHere are three I keep returning to:\n\n1. Wayfinding matters more than aesthetics. Users need to always know where they are.\n\n2. Materials should express their nature. Don't make tappable things look flat.\n\n3. Compression creates drama. Use contrast deliberately.`,
      },
    ]);
    console.log('📝 Posts created');

    // Create comments
    await Comment.create([
      { body: 'This really resonates. I wrote my best essay when I gave myself two weeks instead of two days.', post: post1._id, author: james._id },
      { body: 'Thank you! The pressure to publish constantly is real — but the work suffers for it.',            post: post1._id, author: elena._id },
      { body: 'I did the same! A Field Notes notebook changed my workflow more than any app ever did.',          post: post2._id, author: elena._id },
      { body: 'The low ceiling / high space point is brilliant. Never thought about UI contrast that way.',     post: post3._id, author: james._id },
    ]);
    console.log('💬 Comments created');

    console.log('\n✅ Seed complete!');
    console.log('   elena@inkwell.com / demo123');
    console.log('   james@inkwell.com / demo123');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
