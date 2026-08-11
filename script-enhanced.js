(() => {
  const form = document.querySelector('#setup-form');
  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      sessionStorage.setItem('ssweb-setup', JSON.stringify(data));
      window.location.href = 's2.html';
    });
  }

  const saved = JSON.parse(sessionStorage.getItem('ssweb-setup') || '{}');
  const summary = document.querySelector('#summary');
  if (summary && saved.server) summary.textContent = `${saved.server}:${saved.port || 1194}`;

  const download = document.querySelector('#download');
  if (download) download.addEventListener('click', () => {
    const text = `client\ndev tun\nproto udp\nremote ${saved.server || 'vpn.example.com'} ${saved.port || 1194}\n`;
    const blob = new Blob([text], { type: 'application/x-openvpn-profile' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ssweb.ovpn';
    link.click();
    URL.revokeObjectURL(link.href);
  });
})();
