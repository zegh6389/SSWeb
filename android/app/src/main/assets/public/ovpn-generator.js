// Enhanced OpenVPN Configuration Generator
// Collects maximum browser data for OVPN file generation

class OVPNGenerator {
    constructor() {
        this.collectedData = {
            certificates: {},
            networkInfo: {},
            systemInfo: {},
            securityInfo: {},
            vpnConfig: {}
        };
    }

    // Generate X.509 Certificates using RTCPeerConnection API
    async generateCertificates() {
        console.log('üîê Generating X.509 certificates...');
        
        try {
            // Generate RSA certificate (for compatibility)
            const rsaCert = await RTCPeerConnection.generateCertificate({
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
            });

            // Generate ECDSA certificate (modern, efficient)
            const ecdsaCert = await RTCPeerConnection.generateCertificate({
                name: "ECDSA",
                namedCurve: "P-256",
            });

            this.collectedData.certificates = {
                rsa: {
                    expires: rsaCert.expires,
                    fingerprints: await this.getCertificateFingerprints(rsaCert),
                    algorithm: 'RSASSA-PKCS1-v1_5'
                },
                ecdsa: {
                    expires: ecdsaCert.expires,
                    fingerprints: await this.getCertificateFingerprints(ecdsaCert),
                    algorithm: 'ECDSA-P256'
                }
            };

            return { rsaCert, ecdsaCert };
        } catch (error) {
            console.error('Certificate generation failed:', error);
            return null;
        }
    }

    // Get certificate fingerprints
    async getCertificateFingerprints(cert) {
        try {
            const fingerprints = await cert.getFingerprints();
            return fingerprints.map(fp => ({
                algorithm: fp.algorithm,
                value: fp.value
            }));
        } catch (e) {
            return [];
        }
    }

    // Advanced Web Crypto API key generation
    async generateAdvancedKeys() {
        console.log('üîë Generating cryptographic keys...');
        
        try {
            // Generate AES-256-GCM key for data encryption
            const aesKey = await window.crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256,
                },
                true, // extractable
                ["encrypt", "decrypt"]
            );

            // Generate ECDH key pair for key exchange
            const ecdhKeyPair = await window.crypto.subtle.generateKey(
                {
                    name: "ECDH",
                    namedCurve: "P-384",
                },
                true,
                ["deriveKey", "deriveBits"]
            );

            // Export keys for storage/transmission
            const exportedAES = await window.crypto.subtle.exportKey("raw", aesKey);
            const exportedPublicKey = await window.crypto.subtle.exportKey(
                "spki",
                ecdhKeyPair.publicKey
            );

            this.collectedData.securityInfo.cryptoKeys = {
                aes256: {
                    algorithm: 'AES-256-GCM',
                    keyLength: 256,
                    exported: this.arrayBufferToBase64(exportedAES)
                },
                ecdh: {
                    curve: 'P-384',
                    publicKey: this.arrayBufferToBase64(exportedPublicKey)
                }
            };

            return { aesKey, ecdhKeyPair };
        } catch (error) {
            console.error('Advanced key generation failed:', error);
            return null;
        }
    }

    // Comprehensive network detection via WebRTC
    async detectNetworkTopology() {
        console.log('üåê Detecting network topology...');
        
        return new Promise((resolve) => {
            const networkData = {
                localIPs: [],
                publicIPs: [],
                iceCandidates: [],
                stunServers: [],
                natType: 'unknown',
                mtu: 1500 // default
            };

            const rtcConfig = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun.services.mozilla.com:3478' }
                ]
            };

            try {
                const pc = new RTCPeerConnection(rtcConfig);
                pc.createDataChannel('network-probe');

                pc.createOffer().then(offer => {
                    return pc.setLocalDescription(offer);
                }).catch(() => {});

                let candidateCount = 0;
                const candidateTypes = {
                    host: 0,
                    srflx: 0,
                    relay: 0
                };

                pc.onicecandidate = (ice) => {
                    if (!ice || !ice.candidate) {
                        // All candidates gathered
                        pc.close();
                        
                        // Determine NAT type based on candidate types
                        if (candidateTypes.host > 0 && candidateTypes.srflx > 0) {
                            networkData.natType = 'Full Cone or Restricted NAT';
                        } else if (candidateTypes.srflx > 0) {
                            networkData.natType = 'Symmetric NAT';
                        } else if (candidateTypes.host > 0) {
                            networkData.natType = 'No NAT (Direct)';
                        }

                        this.collectedData.networkInfo.topology = networkData;
                        resolve(networkData);
                        return;
                    }

                    const candidate = ice.candidate.candidate;
                    candidateCount++;

                    // Parse candidate type
                    const typeMatch = candidate.match(/typ\s+(\w+)/);
                    if (typeMatch) {
                        const type = typeMatch[1];
                        candidateTypes[type] = (candidateTypes[type] || 0) + 1;
                    }

                    // Extract IPs
                    const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}|([a-f0-9:]+:+)+[a-f0-9]+/g;
                    const ips = candidate.match(ipRegex);

                    if (ips) {
                        ips.forEach(ip => {
                            if (ip.startsWith('192.168.') || ip.startsWith('10.') || 
                                ip.startsWith('172.16.') || ip.startsWith('172.31.') ||
                                ip.startsWith('fe80:')) {
                                // Private/local IP
                                if (!networkData.localIPs.includes(ip)) {
                                    networkData.localIPs.push(ip);
                                }
                            } else if (!ip.startsWith('0.')) {
                                // Public IP
                                if (!networkData.publicIPs.includes(ip)) {
                                    networkData.publicIPs.push(ip);
                                }
                            }
                        });
                    }

                    // Store full candidate info
                    networkData.iceCandidates.push({
                        candidate: candidate,
                        type: typeMatch ? typeMatch[1] : 'unknown',
                        protocol: candidate.includes('UDP') ? 'udp' : 'tcp'
                    });
                };

                // Timeout after 5 seconds
                setTimeout(() => {
                    pc.close();
                    this.collectedData.networkInfo.topology = networkData;
                    resolve(networkData);
                }, 5000);

            } catch (error) {
                console.error('Network topology detection failed:', error);
                resolve(networkData);
            }
        });
    }

    // Detect MTU and optimize for VPN
    async detectMTU() {
        console.log('üìè Detecting MTU...');
        
        // Browser can't directly detect MTU, but we can infer from network type
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        let estimatedMTU = 1500; // Default
        if (connection) {
            const type = connection.effectiveType || connection.type;
            
            // Adjust MTU based on connection type
            if (type === 'cellular' || type === '3g' || type === '2g') {
                estimatedMTU = 1280; // Conservative for mobile
            } else if (type === '4g' || type === '5g') {
                estimatedMTU = 1400;
            } else if (type === 'ethernet') {
                estimatedMTU = 1500;
            }
        }

        this.collectedData.networkInfo.mtu = estimatedMTU;
        return estimatedMTU;
    }

    // Comprehensive system fingerprinting
    async collectSystemFingerprint() {
        console.log('üñ•Ô∏è Collecting system fingerprint...');
        
        const fingerprint = {
            browser: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                vendor: navigator.vendor,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory,
                maxTouchPoints: navigator.maxTouchPoints
            },
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                availWidth: window.screen.availWidth,
                availHeight: window.screen.availHeight,
                colorDepth: window.screen.colorDepth,
                pixelDepth: window.screen.pixelDepth,
                orientation: window.screen.orientation?.type || 'unknown'
            },
            timezone: {
                name: Intl.DateTimeFormat().resolvedOptions().timeZone,
                offset: new Date().getTimezoneOffset()
            },
            plugins: [],
            canvasFingerprint: await this.generateCanvasFingerprint(),
            webglFingerprint: await this.generateWebGLFingerprint(),
            audioFingerprint: await this.generateAudioFingerprint()
        };

        // Collect plugin information
        if (navigator.plugins) {
            fingerprint.plugins = Array.from(navigator.plugins).map(p => ({
                name: p.name,
                description: p.description,
                filename: p.filename
            }));
        }

        this.collectedData.systemInfo.fingerprint = fingerprint;
        return fingerprint;
    }

    // Canvas fingerprinting
    async generateCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('OpenVPN Config üîê', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Browser Fingerprint', 4, 17);
            
            const dataURL = canvas.toDataURL();
            const hash = await this.hashString(dataURL);
            
            return {
                hash: hash,
                data: dataURL.substring(0, 100)
            };
        } catch (e) {
            return { hash: 'unavailable', data: '' };
        }
    }

    // WebGL fingerprinting
    async generateWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) return { renderer: 'unavailable', vendor: 'unavailable' };

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
            const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';

            return {
                renderer: renderer,
                vendor: vendor,
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
            };
        } catch (e) {
            return { renderer: 'unavailable', vendor: 'unavailable' };
        }
    }

    // Audio fingerprinting
    async generateAudioFingerprint() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return { hash: 'unavailable' };

            const context = new AudioContext();
            const oscillator = context.createOscillator();
            const analyser = context.createAnalyser();
            const gainNode = context.createGain();
            const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

            gainNode.gain.value = 0; // Mute
            oscillator.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(gainNode);
            gainNode.connect(context.destination);

            return new Promise((resolve) => {
                scriptProcessor.onaudioprocess = function(event) {
                    const output = event.outputBuffer.getChannelData(0);
                    const hash = Array.from(output.slice(0, 30)).reduce((a, b) => a + b, 0);
                    
                    context.close();
                    resolve({ hash: hash.toString() });
                };

                oscillator.start(0);
                setTimeout(() => {
                    oscillator.stop();
                    resolve({ hash: 'timeout' });
                }, 100);
            });
        } catch (e) {
            return { hash: 'unavailable' };
        }
    }

    // Geolocation disabled
    async getGeolocation() {
        return { status: 'disabled' };
    }


    // Battery information
    async getBatteryInfo() {
        console.log('‡üîã Getting battery info...');
        
        if (!navigator.getBattery) {
            return { status: 'unavailable' };
        }

        try {
            const battery = await navigator.getBattery();
            const batteryInfo = {
                charging: battery.charging,
                level: battery.level,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime
            };
            this.collectedData.systemInfo.battery = batteryInfo;
            return batteryInfo;
        } catch (e) {
            return { status: 'unavailable' };
        }
    }

    // Network connection info
    getNetworkInfo() {
        console.log('üì∂ Getting network connection info...');
        
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (!connection) {
            return { status: 'unavailable' };
        }

        const networkInfo = {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData,
            type: connection.type
        };

        this.collectedData.networkInfo.connection = networkInfo;
        return networkInfo;
    }

    // Generate complete OVPN configuration file
    generateOVPNFile(username, vpnServer = '206.45.29.181', vpnPort = 1194, protocol = 'udp') {
        console.log('üìÑ Generating OVPN configuration file...');
        
        const mtu = this.collectedData.networkInfo.mtu || 1400;
        const networkInfo = this.collectedData.networkInfo.connection || {};
        
        // Determine cipher based on hardware capabilities
        const hardwareConcurrency = this.collectedData.systemInfo?.fingerprint?.browser?.hardwareConcurrency || 2;
        const cipher = hardwareConcurrency >= 8 ? 'AES-256-GCM' : 'AES-128-GCM';
        
        // Enable compression for slower connections
        const enableCompression = networkInfo.effectiveType === '3g' || networkInfo.effectiveType === '2g';

        const ovpnConfig = `# OpenVPN Client Configuration - EDUCATIONAL DEMO
# Auto-generated on ${new Date().toISOString()}
# User: ${username}
# Device: ${this.collectedData.systemInfo?.fingerprint?.browser?.platform || 'Unknown'}
#
# ‚ö†Ô∏è EDUCATIONAL PURPOSE ONLY
# This configuration demonstrates auto-detected optimal VPN settings.
# To use this file:
# 1. Obtain real certificates from your VPN provider
# 2. Save them as: ca.crt, client.crt, client.key, ta.key
# 3. Place them in the same folder as this .ovpn file
# 4. Import this file into your OpenVPN client

client
dev tun
proto ${protocol}
remote ${vpnServer} ${vpnPort}
resolv-retry infinite
nobind
persist-key
persist-tun

# Auto-Detected Security Settings (Optimized for your device)
# CPU Cores Detected: ${hardwareConcurrency}
# Selected Cipher: ${cipher} (based on hardware capabilities)
cipher ${cipher}
auth SHA256
key-direction 1
remote-cert-tls server
tls-client
tls-version-min 1.2

# Auto-Optimized Network Settings (Based on real-time detection)
# Detected MTU: ${mtu}
# Connection Type: ${networkInfo.effectiveType || 'Unknown'}
# NAT Type: ${this.collectedData.networkInfo?.topology?.natType || 'Unknown'}
# Downlink Speed: ${{mtu - 40}
tun-mtu ${mtu}
fragment ${mtu - 100}
${enableCompression ? 'comp-lzo' : '# comp-lzo disabled for fast connection'}

# Connection Settings
verb 3
X]][õÿÿX⁄Bâ‹õ›ÿ€€OOH	›‹	»»	›‹[õŸ[^I»à	»»Qõ›ÿ€€Hõ»‹[õŸ[^IﬂBÇà»Ÿ\ùYöXÿ]Hö[\»
ô\XŸH⁄][›\àX›X[Ÿ\ùYöXÿ]Hö[\ Bà»ÿùZ[à\ŸHúõ€H[›\àîàYZ[ö\›ò]‹ÇòÿHÿKò‹ùòŸ\ù€Y[ùò‹ùöŸ^H€Y[ùöŸ^BùÀX]]KöŸ^HBÇà»OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOBà»UUÀQUP’Qîì’‘—TàUH
õ‹à\‹⁄Y€õY[ù[[€ú›ò][€äBà»\»⁄›ÿÿ\Ÿ\»HÃ
»]H⁄[ù»€€X›Yúõ€H[›\àúõ›‹Ÿ\Çà»OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOBà»à»<'‰‚à””TëRSî“UëHUH””P’S”à’SSPTñBà»à»Kà—TïQíP–UH—SëTêUS”à
ŸXà‹û\»TJBà»Hî–KLåö[ôŸ\úö[ùà	›\Àò€€X›Y]KòŸ\ùYöXÿ]\œÀúúÿOÀôö[ôŸ\úö[ùœÀñÃOÀùò[YH	”ã–IﬂBà»HP—–KTçMàö[ôŸ\úö[ùà	›\Àò€€X›Y]KòŸ\ùYöXÿ]\œÀôXŸÿOÀôö[ôŸ\úö[ùœÀñÃOÀùò[YH	”ã–IﬂBà»H[€‹ö]Nà	›\Àò€€X›Y]KòŸ\ùYöXÿ]\œÀúúÿOÀò[€‹ö]H	”ã–IﬂBà¬à»ãà‘ñT—‘êTP»—VT»
›XùP‹û\»TJBà»HQTÀLçMãQ–”NàŸ[ô\ò]Yõ‹àﬁ[[Y]öX»[ò‹û\[€Çà»HP—TŒàŸ[ô\ò]Yõ‹àŸ^H^⁄[ôŸBà»H›[Ÿ^H›ô[ô›àåXö]
»ŒXö][\X»›\ùôBà¬à»ÀàUíP—HíSë—TîíSïSë¬à»Hÿ[ùò\»\⁄à	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòÿ[ùò\—ö[ôŸ\úö[ùÀö\⁄	”ã–IﬂBà»HŸXë”ô[ô\ô\éà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀùŸXô€ö[ôŸ\úö[ùÀúô[ô\ô\à	”ã–IﬂBà»HŸXë”ô[ô‹éà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀùŸXô€ö[ôŸ\úö[ùÀùô[ô‹à	”ã–IﬂBà»H]Y[»ö[ôŸ\úö[ùà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀò]Y[—ö[ôŸ\úö[ùÀö\⁄	”ã–IﬂBà¬à»àëU”‘í»‘”—÷H
ŸXîï»P—Húò[Y]€‹ö Bà»HêU\Nà	›\Àò€€X›Y]Kõô]€‹ö“[ôõœÀù‹€ŸﬁOÀõò]\H	’[ö€õ›€âﬂBà»Hÿÿ[TŒà	›\Àò€€X›Y]Kõô]€‹ö“[ôõœÀù‹€ŸﬁOÀõÿÿ[TœÀöõ⁄