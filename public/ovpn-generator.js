const fs = require('fs');
const path = require('path');

const CONFIG = {
  outputDir: path.join(__dirname, 'generated'),
  templateDir: path.join(__dirname, 'templates')
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizeName(value) {
  return String(value || 'client').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

function buildConfig(options = {}) {
  const name = normalizeName(options.name);
  const server = String(options.server || 'vpn.example.com').trim();
  const port = Number(options.port || 1194);
  const protocol = String(options.protocol || 'udp').toLowerCase();
  const lines = [
    'client',
    'dev tun',
    `proto ${protocol}`,
    `remote ${server} ${port}`,
    'resolv-retry infinite',
    'nobind',
    'persist-key',
    'persist-tun',
    'remote-cert-tls server',
    'verb 3'
  ];
  if (options.ca) lines.push('<ca>', options.ca, '</ca>');
  if (options.cert) lines.push('<cert>', options.cert, '</cert>');
  if (options.key) lines.push('<key>', options.key, '</key>');
  return { name, content: `${lines.join('\n')}\n` };
}

function writeConfig(options) {
  ensureDir(CONFIG.outputDir);
  const config = buildConfig(options);
  const file = path.join(CONFIG.outputDir, `${config.name}.ovpn`);
  fs.writeFileSync(file, config.content, 'utf8');
  return file;
}

if (require.main === module) {
  const [, , name, server, port] = process.argv;
  console.log(writeConfig({ name, server, port }));
}

module.exports = { buildConfig, writeConfig, normalizeName };
