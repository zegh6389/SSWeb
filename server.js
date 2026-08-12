const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

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

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(port, () => console.log(`SSWeb listening on ${port}`));
}

module.exports = app;
