export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email, password, imapHost, imapPort } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing email or password' });
    }
    // Placeholder: forward to backend / store. Do not log password.
    const result = {
      ok: true,
      received: { email: !!email, password: !!password, imapHost: imapHost || null, imapPort: imapPort || null },
      timestamp: new Date().toISOString(),
    };
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
}