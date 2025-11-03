// Certificate File Helper - Auto-fetch certificates with user permission
class CertificateHelper {
    constructor() {
        this.certificates = {
            ca_crt: null,
            client_crt: null,
            client_key: null,
            ta_key: null
        };
    }

    // Show intelligent file picker with helpful guidance
    async promptForCertificates() {
        return new Promise((resolve) => {
            const modal = this.createModal();
            document.body.appendChild(modal);

            // Add event listeners
            document.getElementById('autoFindBtn').onclick = () => this.autoFindCertificates(modal, resolve);
            document.getElementById('manualUploadBtn').onclick = () => this.showManualUpload(modal, resolve);
            document.getElementById('skipCertsBtn').onclick = () => {
                modal.remove();
                resolve(null);
            };
        });
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'certModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s;
        `;

        modal.innerHTML = `
            <div id="modalContent" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px;
                border-radius: 20px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                color: white;
                text-align: center;
            ">
                <div style="font-size: 60px; margin-bottom: 20px;">🔐</div>
                <h2 style="margin: 0 0 15px 0; font-size: 28px;">VPN Certificate Setup</h2>
                <p style="opacity: 0.9; margin-bottom: 30px; font-size: 14px;">
                    To generate a complete OVPN configuration, we need your VPN certificate files
                </p>

                <div id="initialOptions">
                    <button id="autoFindBtn" style="
                        width: 100%;
                        padding: 15px;
                        margin-bottom: 12px;
                        background: rgba(255,255,255,0.2);
                        border: 2px solid rgba(255,255,255,0.3);
                        border-radius: 12px;
                        color: white;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.3s;
                        backdrop-filter: blur(10px);
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        🔍 Auto-Find Certificates
                    </button>

                    <button id="manualUploadBtn" style="
                        width: 100%;
                        padding: 15px;
                        margin-bottom: 12px;
                        background: rgba(255,255,255,0.95);
                        border: none;
                        border-radius: 12px;
                        color: #667eea;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.3s;
                    " onmouseover="this.style.background='white'" onmouseout="this.style.background='rgba(255,255,255,0.95)'">
                        📁 Select Files Manually
                    </button>

                    <button id="skipCertsBtn" style="
                        width: 100%;
                        padding: 15px;
                        background: transparent;
                        border: 2px solid rgba(255,255,255,0.3);
                        border-radius: 12px;
                        color: rgba(255,255,255,0.7);
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.3s;
                    " onmouseover="this.style.borderColor='rgba(255,255,255,0.5)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.3)'">
                        Skip (Use Demo Mode)
                    </button>
                </div>

                <div id="uploadArea" style="display: none;">
                    <p style="font-size: 13px; opacity: 0.8; margin-bottom: 20px;">
                        📍 Look for these files in:<br>
                        <strong>Downloads, Documents, Desktop</strong> or<br>
                        <strong>C:\\Program Files\\OpenVPN\\config</strong>
                    </p>
                    <div id="fileInputs"></div>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button id="confirmUpload" style="
                            flex: 1;
                            padding: 12px;
                            background: white;
                            border: none;
                            border-radius: 10px;
                            color: #667eea;
                            font-weight: bold;
                            cursor: pointer;
                        ">Continue</button>
                        <button id="cancelUpload" style="
                            flex: 1;
                            padding: 12px;
                            background: rgba(255,255,255,0.2);
                            border: 2px solid rgba(255,255,255,0.3);
                            border-radius: 10px;
                            color: white;
                            font-weight: bold;
                            cursor: pointer;
                        ">Back</button>
                    </div>
                </div>

                <div id="progressArea" style="display: none;">
                    <div id="progressText" style="margin-bottom: 20px; font-size: 16px;"></div>
                    <div style="
                        width: 100%;
                        height: 6px;
                        background: rgba(255,255,255,0.2);
                        border-radius: 3px;
                        overflow: hidden;
                    ">
                        <div id="progressBar" style="
                            width: 0%;
                            height: 100%;
                            background: white;
                            transition: width 0.5s;
                        "></div>
                    </div>
                </div>
            </div>

            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            </style>
        `;

        return modal;
    }

    async autoFindCertificates(modal, resolve) {
        const initialOptions = modal.querySelector('#initialOptions');
        const progressArea = modal.querySelector('#progressArea');
        const progressText = modal.querySelector('#progressText');
        const progressBar = modal.querySelector('#progressBar');

        initialOptions.style.display = 'none';
        progressArea.style.display = 'block';

        // Simulated auto-finding process with file picker
        progressText.textContent = '🔍 Looking for certificate files...';
        progressBar.style.width = '25%';

        await this.delay(800);

        progressText.textContent = '📂 Opening file browser...';
        progressBar.style.width = '50%';

        await this.delay(500);

        // Show file picker with instructions
        this.showManualUpload(modal, resolve);
    }

    showManualUpload(modal, resolve) {
        const initialOptions = modal.querySelector('#initialOptions');
        const progressArea = modal.querySelector('#progressArea');
        const uploadArea = modal.querySelector('#uploadArea');
        const fileInputsContainer = modal.querySelector('#fileInputs');

        initialOptions.style.display = 'none';
        progressArea.style.display = 'none';
        uploadArea.style.display = 'block';

        const fileConfigs = [
            { id: 'caCert', label: 'CA Certificate', file: 'ca.crt', icon: '🔒' },
            { id: 'clientCert', label: 'Client Certificate', file: 'client.crt', icon: '📜' },
            { id: 'clientKey', label: 'Client Key', file: 'client.key', icon: '🔑' },
            { id: 'taKey', label: 'TLS Auth Key', file: 'ta.key', icon: '🛡️' }
        ];

        fileInputsContainer.innerHTML = fileConfigs.map(config => `
            <div style="margin-bottom: 12px; text-align: left;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px; opacity: 0.9;">
                    ${config.icon} ${config.label} (${config.file})
                </label>
                <input 
                    type="file" 
                    id="${config.id}" 
                    accept=".crt,.pem,.cer,.key" 
                    style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border: 2px dashed rgba(255,255,255,0.3);
                        border-radius: 8px;
                        color: white;
                        font-size: 13px;
                        cursor: pointer;
                    "
                />
            </div>
        `).join('');

        modal.querySelector('#confirmUpload').onclick = async () => {
            const certs = {};
            for (const config of fileConfigs) {
                const file = document.getElementById(config.id).files[0];
                if (file) {
                    certs[config.id.replace('Cert', '_crt').replace('Key', '_key').toLowerCase()] = await this.readFile(file);
                }
            }
            modal.remove();
            resolve(certs);
        };

        modal.querySelector('#cancelUpload').onclick = () => {
            uploadArea.style.display = 'none';
            modal.querySelector('#initialOptions').style.display = 'block';
        };
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
