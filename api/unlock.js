import crypto from 'node:crypto';

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  const size = Math.max(a.length, b.length, 1);
  const aa = Buffer.alloc(size);
  const bb = Buffer.alloc(size);
  a.copy(aa);
  b.copy(bb);
  return crypto.timingSafeEqual(aa, bb) && a.length === b.length;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = process.env.PLANNER_USER || '';
  const password = process.env.PLANNER_PASSWORD || '';
  if (!user || !password) {
    res.status(503).json({ error: 'Owner login is not configured on this deployment.' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const username = String(body.username || '');
  const pass = String(body.password || '');
  if (!safeEqual(username, user) || !safeEqual(pass, password)) {
    res.status(401).json({ error: 'Invalid login' });
    return;
  }

  let config = null;
  if (process.env.STUDENT_CONFIG) {
    try {
      config = JSON.parse(process.env.STUDENT_CONFIG);
    } catch {
      res.status(500).json({ error: 'STUDENT_CONFIG is not valid JSON' });
      return;
    }
  }

  res.status(200).json({ ok: true, config });
}
