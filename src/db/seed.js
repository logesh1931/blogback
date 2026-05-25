require('dotenv').config();
const pool = require('./pool');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');

    // Clear existing data
    await client.query('TRUNCATE comments, posts, users RESTART IDENTITY CASCADE');

    // Users
    const hash = await bcrypt.hash('demo123', 10);
    const { rows: users } = await client.query(`
      INSERT INTO users (name, email, password, bio) VALUES
        ('Elena Marsh', 'elena@inkwell.com', $1, 'Fiction writer & coffee enthusiast'),
        ('James Wolfe',  'james@inkwell.com', $1, 'Tech journalist covering AI and design')
      RETURNING id
    `, [hash]);

    const [elena, james] = users;

    // Posts
    const { rows: posts } = await client.query(`
      INSERT INTO posts (title, category, body, author_id) VALUES
        ('The Art of Slow Writing', 'craft',
         'Writing, like most creative acts, suffers when rushed. We live in a culture of productivity hacks and word-count goals, but the best prose often emerges from patience — from sitting with an idea until it crystallizes.\n\nI''ve spent the last year writing more slowly. Not out of laziness, but out of care. Each sentence gets a second look. Each paragraph earns its place. The result isn''t less work — it''s more intentional work.\n\nTry this: write one paragraph tomorrow. Just one. Make it perfect.',
         $1),
        ('Why I Deleted All My Productivity Apps', 'lifestyle',
         'Six months ago I had fourteen apps promising to make me more productive. Calendar sync, habit trackers, time-blockers, focus timers, smart to-do lists. Each one required onboarding, maintenance, and mental overhead.\n\nThen I tried something radical: a paper notebook and a single daily list.\n\nThe results surprised me. Without the dopamine loop of checking off digital tasks, I started thinking more carefully about what actually mattered.',
         $2),
        ('Design Principles I Stole from Architecture', 'design',
         'Buildings have to work. A door that looks beautiful but is hard to open fails. Architecture has centuries of hard-won lessons that digital product designers often ignore.\n\n1. Wayfinding matters more than aesthetics.\n2. Materials should express their nature.\n3. Compression creates drama — use contrast deliberately.',
         $1)
      RETURNING id
    `, [elena.id, james.id]);

    // Comments
    await client.query(`
      INSERT INTO comments (body, post_id, author_id) VALUES
        ('This really resonates. I wrote my best essay when I gave myself two weeks instead of two days.', $1, $2),
        ('Thank you! The pressure to publish constantly is real — but the work suffers for it.', $1, $3),
        ('I did the same thing! A Field Notes notebook changed my workflow more than any app ever did.', $2, $3),
        ('The low ceiling / high space point is brilliant. Never thought about contrast that way in UI.', $3, $2)
    `, [posts[0].id, james.id, elena.id]);

    console.log('✅ Seed complete. Demo logins: elena@inkwell.com / demo123');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
