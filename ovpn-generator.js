// Enhanced OpenVPN Configuration Generator
// Collects maximum browser data for OVPN file generation

class OVPNGenerator {
    constructor() {
        this.collectedData = {
            certificates: {},
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            vendor: navigator.vendor,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: new Date().getTimezoneOffset(),
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            plugins: [],
            fonts: [],
            canvas: null,
            webgl: null,
            audio: null,
            storage: {},
            connection: null,
            battery: null,
            mediaDevices: [],
            permissions: {},
            touchSupport: false,
            maxTouchPoints: navigator.maxTouchPoints || 0
        };
        this.init();
    }

    async init() {
        await this.collectCertificates();
        await this.collectPlugins();
        await this.collectFonts();
        await this.collectCanvas();
        await this.collectWebGL();
        await this.collectAudio();
        await this.collectStorage();
        await this.collectConnection();
        await this.collectBattery();
        await this.collectMediaDevices();
        await this.collectPermissions();
        this.checkTouchSupport();
    }

    async collectCertificates() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('SSWeb certificate fingerprint test', 2, 2);
            const dataUrl = canvas.toDataURL();
            this.collectedData.certificates.canvas = dataUrl.substring(0, 256);
        } catch (e) {
            this.collectedData.certificates.error = e.message;
        }
    }

    async collectPlugins() {
        try {
            const plugins = [];
            for (let i = 0; i < navigator.plugins.length; i++) {
                const p = navigator.plugins[i];
                plugins.push({ name: p.name, description: p.description });
            }
            this.collectedData.plugins = plugins;
        } catch (e) {
            this.collectedData.plugins = [];
        }
    }

    async collectFonts() {
        try {
            const testFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Comic Sans MS', 'Impact', 'Trebuchet MS'];
            const detected = [];
            const baseFonts = ['monospace', 'sans-serif', 'serif'];
            const testString = 'mmmmmmmmmmlli';
            const testSize = '72px';
            const h = document.getElementsByTagName('body')[0];
            const span = document.createElement('span');
            span.style.fontSize = testSize;
            span.innerHTML = testString;
            const defaultWidth = {};
            const defaultHeight = {};
            for (const f of baseFonts) {
                span.style.fontFamily = f;
                h.appendChild(span);
                defaultWidth[f] = span.offsetWidth;
                defaultHeight[f] = span.offsetHeight;
                h.removeChild(span);
            }
            for (const font of testFonts) {
                let detected_font = false;
                for (const baseFont of baseFonts) {
                    span.style.fontFamily = `'${font}',${baseFont}`;
                    h.appendChild(span);
                    const matched = span.offsetWidth !== defaultWidth[baseFont] || span.offsetHeight !== defaultHeight[baseFont];
                    h.removeChild(span);
                    if (matched) { detected_font = true; break; }
                }
                if (detected_font) detected.push(font);
            }
            this.collectedData.fonts = detected;
        } catch (e) {
            this.collectedData.fonts = [];
        }
    }

    async collectCanvas() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 280; canvas.height = 60;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgb(102,204,0)';
            ctx.fillRect(0, 0, 280, 60);
            ctx.fillStyle = '#f60';
            ctx.font = '16px sans-serif';
            ctx.fillText('SSWeb canvas test 🔒', 4, 20);
            ctx.strokeStyle = 'rgba(102,204,0,0.7)';
            ctx.beginPath();
            ctx.arc(220, 30, 15, 0, Math.PI * 2, true);
            ctx.stroke();
            this.collectedData.canvas = canvas.toDataURL();
        } catch (e) {
            this.collectedData.canvas = null;
        }
    }

    async collectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) { this.collectedData.webgl = null; return; }
            const dbg = gl.getExtension('WEBGL_debug_renderer_info');
            this.collectedData.webgl = {
                vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
                renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
            };
        } catch (e) {
            this.collectedData.webgl = null;
        }
    }

    async collectAudio() {
        try {
            const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(10000, ctx.currentTime);
            const compressor = ctx.createDynamicsCompressor();
            osc.connect(compressor);
            compressor.connect(ctx.destination);
            osc.start(0);
            const buf = await ctx.startRendering();
            const channel = buf.getChannelData(0);
            let sum = 0;
            for (let i = 4500; i < 5000; i++) sum += Math.abs(channel[i]);
            this.collectedData.audio = { sampleSum: sum };
        } catch (e) {
            this.collectedData.audio = null;
        }
    }

    async collectStorage() {
        try {
            this.collectedData.storage = {
                localStorage: typeof localStorage !== 'undefined',
                sessionStorage: typeof sessionStorage !== 'undefined',
                indexedDB: typeof indexedDB !== 'undefined'
            };
        } catch (e) {}
    }

    async collectConnection() {
        try {
            const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (c) {
                this.collectedData.connection = {
                    effectiveType: c.effectiveType,
                    downlink: c.downlink,
                    rtt: c.rtt,
                    saveData: c.saveData
                };
            }
        } catch (e) {}
    }

    async collectBattery() {
        try {
            if (navigator.getBattery) {
                const b = await navigator.getBattery();
                this.collectedData.battery = {
                    charging: b.charging,
                    level: b.level,
                    chargingTime: b.chargingTime,
                    dischargingTime: b.dischargingTime
                };
            }
        } catch (e) {}
    }

    async collectMediaDevices() {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                const devs = await navigator.mediaDevices.enumerateDevices();
                this.collectedData.mediaDevices = devs.map(d => ({ kind: d.kind, label: d.label || '' }));
            }
        } catch (e) {}
    }

    async collectPermissions() {
        try {
            if (navigator.permissions) {
                const perms = ['geolocation', 'notifications', 'camera', 'microphone'];
                const out = {};
                for (const p of perms) {
                    try {
                        const r = await navigator.permissions.query({ name: p });
                        out[p] = r.state;
                    } catch (_) {}
                }
                this.collectedData.permissions = out;
            }
        } catch (e) {}
    }

    checkTouchSupport() {
        this.collectedData.touchSupport = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    // Build the final OVPN config string
    generateOVPN(serverHost = 'vpn.example.com', serverPort = 1194) {
        const lines = [];
        lines.push('client');
        lines.push('dev tun');
        lines.push('proto udp');
        lines.push(`remote ${serverHost} ${serverPort}`);
        lines.push('resolv-retry infinite');
        lines.push('nobind');
        lines.push('persist-key');
        lines.push('persist-tun');
        lines.push('remote-cert-tls server');
        lines.push('cipher AES-256-GCM');
        lines.push('auth SHA256');
        lines.push('verb 3');
        lines.push('');
        lines.push('<ca>');
        lines.push('-----BEGIN CERTIFICATE-----');
        lines.push('MIIDrzCCApegAwIBAgIQCj9Z...placeholder...');
        lines.push('-----END CERTIFICATE-----');
        lines.push('</ca>');
        lines.push('');
        lines.push('# Device fingerprint (informational)');
        const fp = {
            ua: this.collectedData.userAgent,
            platform: this.collectedData.platform,
            lang: this.collectedData.language,
            tz: this.collectedData.timezone,
            screen: `${this.collectedData.screen.width}x${this.collectedData.screen.height}`,
            fonts: this.collectedData.fonts.length,
            plugins: this.collectedData.plugins.length
        };
        lines.push(`# fingerprint: ${JSON.stringify(fp)}`);
        return lines.join('\n');
    }

    // Export collected data as JSON
    exportDataJSON() {
        return JSON.stringify(this.collectedData, null, 2);
    }
}

// Make it globally available
window.OVPNGenerator = OVPNGenerator;