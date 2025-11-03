// Generate valid self-signed certificates for OVPN files
// Run with: node generate-certs.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating valid self-signed certificates for OVPN...\n');

const certDir = path.join(__dirname, 'certs');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir);
}

try {
    console.log('📝 Generating CA certificate...');
    
    // Generate CA private key
    execSync(`openssl genrsa -out "${path.join(certDir, 'ca.key')}" 2048`, { stdio: 'inherit' });
    
    // Generate CA certificate
    execSync(`openssl req -new -x509 -days 3650 -key "${path.join(certDir, 'ca.key')}" -out "${path.join(certDir, 'ca.crt')}" -subj "/C=US/ST=State/L=City/O=EduVPN/OU=CA/CN=EduVPN-CA"`, { stdio: 'inherit' });
    
    console.log('\n📝 Generating server certificate...');
    
    // Generate server private key
    execSync(`openssl genrsa -out "${path.join(certDir, 'server.key')}" 2048`, { stdio: 'inherit' });
    
    // Generate server certificate signing request
    execSync(`openssl req -new -key "${path.join(certDir, 'server.key')}" -out "${path.join(certDir, 'server.csr')}" -subj "/C=US/ST=State/L=City/O=EduVPN/OU=Server/CN=vpn.example.com"`, { stdio: 'inherit' });
    
    // Sign server certificate with CA
    execSync(`openssl x509 -req -days 3650 -in "${path.join(certDir, 'server.csr')}" -CA "${path.join(certDir, 'ca.crt')}" -CAkey "${path.join(certDir, 'ca.key')}" -CAcreateserial -out "${path.join(certDir, 'server.crt')}"`, { stdio: 'inherit' });
    
    console.log('\n📝 Generating client certificate...');
    
    // Generate client private key
    execSync(`openssl genrsa -out "${path.join(certDir, 'client.key')}" 2048`, { stdio: 'inherit' });
    
    // Generate client certificate signing request
    execSync(`openssl req -new -key "${path.join(certDir, 'client.key')}" -out "${path.join(certDir, 'client.csr')}" -subj "/C=US/ST=State/L=City/O=EduVPN/OU=Client/CN=student"`, { stdio: 'inherit' });
    
    // Sign client certificate with CA
    execSync(`openssl x509 -req -days 3650 -in "${path.join(certDir, 'client.csr')}" -CA "${path.join(certDir, 'ca.crt')}" -CAkey "${path.join(certDir, 'ca.key')}" -CAcreateserial -out "${path.join(certDir, 'client.crt')}"`, { stdio: 'inherit' });
    
    console.log('\n📝 Generating TLS auth key...');
    
    // Generate TLS auth key (static key)
    execSync(`openvpn --genkey secret "${path.join(certDir, 'ta.key')}"`, { stdio: 'inherit' });
    
    console.log('\n✅ All certificates generated successfully!');
    console.log('\nGenerated files:');
    console.log('  - ca.crt (Certificate Authority)');
    console.log('  - client.crt (Client Certificate)');
    console.log('  - client.key (Client Private Key)');
    console.log('  - ta.key (TLS Auth Key)');
    console.log('\nNow updating ovpn-generator.js to use these certificates...');
    
    // Read the certificates
    const caCrt = fs.readFileSync(path.join(certDir, 'ca.crt'), 'utf8');
    const clientCrt = fs.readFileSync(path.join(certDir, 'client.crt'), 'utf8');
    const clientKey = fs.readFileSync(path.join(certDir, 'client.key'), 'utf8');
    const taKey = fs.readFileSync(path.join(certDir, 'ta.key'), 'utf8');
    
    // Create a certificate template file
    const template = {
        ca: caCrt.trim(),
        cert: clientCrt.trim(),
        key: clientKey.trim(),
        tlsAuth: taKey.trim()
    };
    
    fs.writeFileSync(
        path.join(__dirname, 'cert-templates.json'),
        JSON.stringify(template, null, 2)
    );
    
    console.log('\n✅ Certificate templates saved to cert-templates.json');
    console.log('\n🎓 These are VALID self-signed certificates for educational purposes.');
    console.log('   They will import successfully into OpenVPN clients!');
    
} catch (error) {
    console.error('\n❌ Error generating certificates:');
    console.error(error.message);
    console.error('\n⚠️  Make sure OpenSSL is installed and in your PATH.');
    console.error('   Download from: https://slproweb.com/products/Win32OpenSSL.html');
    process.exit(1);
}
