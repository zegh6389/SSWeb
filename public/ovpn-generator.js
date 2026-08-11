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
                maxTouchPoints: navigator.maxTozuchPoints
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
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7*';
            ctx.fillText('Browser Fingerprint', 4, 17);
            
            const dataURL (canvas.toDataURL();
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
        console.log('üîã Getting battery info...');
        
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
# NAT type: 
${this.collectedData.networkInfo?.topology?.natType || 'Unknown'}
# Downlink Speed: ${networkInfo.downlink || 'N/A'} Mbps
# Network RTT: ${networkInfo.rtt || 'N/A'} ms
mtu-disc yes
mssfix ${mtu - 40}
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
ŸXîï»P—Húò[Y]€‹ö Bà»HêU\Nà	›\Àò€€X›Y]Kõô]€‹ö“[ôõœÀù‹€ŸﬁOÀõò]\H	’[ö€õ›€âﬂBà»Hÿÿ[TŒà	›\Àò€€X›Y]Kõô]€‹ö“[ôõœÀù‹€ŸﬁOÀõÿÿ[TœÀöõ⁄[ä	À	 H	”õ€ôH]X›Y	ﬂBà»HXõX»TŒà	›\Àò€€X›Y]Kõô]€‹ö“[ôõœÀù‹€ŸﬁOÀúXõX“TœÀöõ⁄[ä	À	 H	”õ€ôH]X›Y	ﬂBà»HP—Hÿ[ôY]\»ÿ]\ôYà	›\Àò€€X›Y]Kõô]€‹ö“[ôõœÀù‹€ŸﬁOÀöXŸPÿ[ôY]\œÀõ[ô›Bà¬à»Kà””ìëP’S”àSêST“T¬à»H€€õôX›[€à\Nà	€ô]€‹ö“[ôõÀôYôôX›]ôU\H	’[ö€õ›€âﬂBà»H›€õ[ö»‹YYà	€ô]€‹ö“[ôõÀô›€õ[ö»	”ã–IﬂHXú¬à»Hõ›[ôUö\[YNà	€ô]€‹ö“[ôõÀúù	”ã–IﬂH\¬à»H]Hÿ]ô\à[ŸNà	€ô]€‹ö“[ôõÀúÿ]ôQ]Hò[Ÿ_Bà»H€€õôX›[€à\Nà	€ô]€‹ö“[ôõÀù\H	’[ö€õ›€âﬂBà¬à»ãàTë–TëH‘P“QíP–US”î¬à»H‘H€‹ô\Œà	⁄\ôÿ\ôP€€ò›\úô[òﬁ_Bà»H]öXŸHY[[‹ûNà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀô]öXŸSY[[‹ûH	”ã–IﬂH–Çà»H]õ‹õNà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀú]õ‹õH	’[ö€õ›€âﬂBà»H\Ÿ\àYŸ[ùà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀù\Ÿ\êYŸ[ù	’[ö€õ›€âﬂBà»HX^›X⁄⁄[ùŒà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀõX^›X⁄⁄[ù»Bà¬à»ÀàT‘VHSëì‘ìPUS”Çà»Hÿ‹ôY[éà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀúÿ‹ôY[èÀù⁄Y	”ã–Iﬂ^	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀúÿ‹ôY[èÀöZY⁄	”ã–IﬂBà»H€€‹à\à	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀúÿ‹ôY[èÀò€€‹ë\	”ã–IﬂKXö]à»H^[ò][Œà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀúÿ‹ôY[èÀú^[ò][»	”ã–IﬂBà¬à»à÷T’SHSëì‘ìPUS”Çà»H[ô›XYŸ\Œà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀõ[ô›XYŸ\œÀöõ⁄[ä	À	 H	”ã–IﬂBà»H[Y^õ€ôNà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀù[Y^õ€ôH	”ã–IﬂBà»HY⁄[úŒà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀúY⁄[ú»Bà»H»õ›òX⁄Œà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀô”õ›òX⁄»	”õ›Ÿ]	ﬂBà¬à»Kà””P’S”àQUQUBà»H›[]H⁄[ù»€€X›YàÃ
¬à»H€€X›[€à[YNà	›\Àò€€X›Y]Kò€€X›[€í[ôõœÀô\ò][€à	”ã–IﬂH\¬à»H[Y\›[\à	€ô]»]J
Kù“T”‘›ö[ô 
_Bà»H€€X›[€à›XÿŸ\‹Œà	›\Àò€€X›Y]Kò€€X›[€í[ôõœÀú›XÿŸ\‹»»	÷Y\…»à	‘\ùX[	ﬂBà¬à»OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOBà»T‘“Q”ìQSïì’T¬à»OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOBà»à»\»€€ôöY›\ò][€à[[€ú›ò]\ŒÇà»8ß!H[Ÿ\õàúõ›‹Ÿ\àTH\ÿYŸH
ï‘Y\ê€€õôX›[€ã›XùP‹û\ÀŸXîï Bà»8ß!H€€\ôZ[ú⁄]ôH]H€€X›[€à
Ã
»[ö\]YH]H⁄[ù Bà»8ß!H]]ÀS‹[Z^ò][€àò\ŸY€à]öXŸHÿ\Xö[]Y\¬à»8ß!Hô]€‹ö»‹€ŸﬁH]X›[€àöXHŸXîï»P—Bà»8ß!HYò[òŸYö[ôŸ\úö[ù[ô»
ÿ[ùò\ÀŸXë”]Y[ Bà»8ß!H‹û\Ÿ‹ò\X»Ÿ^HŸ[ô\ò][€à
QTÀLçMãP—TŒî–KLåP—–KTçMäBà»8ß!H[ù[YŸ[ù€€ôöY›\ò][€àŸ[X›[€à
⁄\\ãUK€€\ô\‹⁄[€äBà¬à»YXÿ][€ò[ò[YNÇà»H[[€ú›ò]\»›»[Ÿ\õàŸXà\»€€X›]öXŸH[ôõ‹õX][€Çà»H⁄›‹»õ‹\à\ŸHŸàŸXà‹û\»THõ‹àŸ\ùYöXÿ]HŸ[ô\ò][€Çà»H[\›ò]\»ô]€‹ö»‹€ŸﬁH]X›[€à⁄]›]Ÿ\ùô\ã\⁄YH€ŸBà»HXX⁄Y\»Xõ›]úõ›‹Ÿ\àö[ôŸ\úö[ù[ô»X⁄ö\]Y\¬à»Hõ›öY\»ôX[]€‹õ^[\HŸàîà€€ôöY›\ò][€à‹[Z^ò][€Çà»à»õ‹à[›\à[ö]ô\ú⁄]H\‹⁄Y€õY[ù›XõZ\‹⁄[€ÇàŸ][Y[›]


HOà¬à‹ÿ⁄[]‹ãú›‹

N¬àô\€€ôJ»\⁄à	›[Y[›]	»JN¬àKL
N¬àJN¬àHÿ]⁄
JH¬àô]\õà»\⁄à	›[ò]òZ[XõI»N¬àBàBÇàÀ»Ÿ[€ÿÿ][€à\ÿXõYà\ﬁ[ò»Ÿ]Ÿ[€ÿÿ][€ä
H¬àô]\õà»›]\Œà	Ÿ\ÿXõY	»N¬àBÇÇàÀ»ò]\ûH[ôõ‹õX][€Çà\ﬁ[ò»Ÿ]ò]\ûR[ôõ 
H¬à€€ú€€KõŸ 	¸'Â"»Ÿ][ô»ò]\ûH[ôõÀããâ N¬ààYà
[ò]öYÿ]‹ãôŸ]ò]\ûJH¬àô]\õà»›]\Œà	›[ò]òZ[XõI»N¬àBÇàûH¬à€€ú›ò]\ûHH]ÿZ]ò]öYÿ]‹ãôŸ]ò]\ûJ
N¬à€€ú›ò]\ûR[ôõ»H¬à⁄\ô⁄[ôŒàò]\ûKò⁄\ô⁄[ôÀà]ô[àò]\ûKõ]ô[à⁄\ô⁄[ô’[YNàò]\ûKò⁄\ô⁄[ô’[YKà\ÿ⁄\ô⁄[ô’[YNàò]\ûKô\ÿ⁄\ô⁄[ô’[YBàN¬à\Àò€€X›Y]Kúﬁ\›[R[ôõÀòò]\ûHHò]\ûR[ôõŒ¬àô]\õàò]\ûR[ôõŒ¬àHÿ]⁄
JH¬àô]\õà»›]\Œà	›[ò]òZ[XõI»N¬àBàBÇàÀ»ô]€‹ö»€€õôX›[€à[ôõ¬àŸ]ô]€‹ö“[ôõ 
H¬à€€ú€€KõŸ 	¸'‰ÌàŸ][ô»ô]€‹ö»€€õôX›[€à[ôõÀããâ N¬àà€€ú›€€õôX›[€àHò]öYÿ]‹ãò€€õôX›[€àò]öYÿ]‹ãõ[ﬁê€€õôX›[€àò]öYÿ]‹ãùŸXö⁄]€€õôX›[€é¬ààYà
X€€õôX›[€äH¬àô]\õà»›]\Œà	›[ò]òZ[XõI»N¬àBÇà€€ú›ô]€‹ö“[ôõ»H¬àYôôX›]ôU\Nà€€õôX›[€ãôYôôX›]ôU\Kà›€õ[öŒà€€õôX›[€ãô›€õ[öÀàùà€€õôX›[€ãúùàÿ]ôQ]Nà€€õôX›[€ãúÿ]ôQ]Kà\Nà€€õôX›[€ãù\BàN¬Çà\Àò€€X›Y]Kõô]€‹ö“[ôõÀò€€õôX›[€àHô]€‹ö“[ôõŒ¬àô]\õàô]€‹ö“[ôõŒ¬àBÇàÀ»Ÿ[ô\ò]H€€\]H’îà€€ôöY›\ò][€àö[BàŸ[ô\ò]S’îëö[J\Ÿ\õò[YKúîŸ\ùô\àH	ÃåãçKåéKåNIÀúî‹ùHLNMõ›ÿ€€H	›Y	 H¬à€€ú€€KõŸ 	¸'‰·Ÿ[ô\ò][ô»’îà€€ôöY›\ò][€àö[Kããâ N¬àà€€ú›]HH\Àò€€X›Y]Kõô]€‹ö“[ôõÀõ]HM¬à€€ú›ô]€‹ö“[ôõ»H\Àò€€X›Y]Kõô]€‹ö“[ôõÀò€€õôX›[€àﬂN¬ààÀ»]\õZ[ôH⁄\\àò\ŸY€à\ôÿ\ôHÿ\Xö[]Y\¬à€€ú›\ôÿ\ôP€€ò›\úô[òﬁHH\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀö\ôÿ\ôP€€ò›\úô[òﬁHé¬à€€ú›⁄\\àH\ôÿ\ôP€€ò›\úô[òﬁHèH»	–QTÀLçMãQ–”I»à	–QTÀLLéQ–”IŒ¬ààÀ»[òXõH€€\ô\‹⁄[€àõ‹à€›Ÿ\à€€õôX›[€ú¬à€€ú›[òXõP€€\ô\‹⁄[€àHô]€‹ö“[ôõÀôYôôX›]ôU\HOOH	ÃŸ…»ô]€‹ö“[ôõÀôYôôX›]ôU\HOOH	Ãô…Œ¬Çà€€ú››úê€€ôöY»H»‹[ïîà€Y[ù€€ôöY›\ò][€àHQP–US”êSSS¬à»]]ÀYŸ[ô\ò]Y€à	€ô]»]J
Kù“T”‘›ö[ô 
_Bà»\Ÿ\éà	›\Ÿ\õò[Y_Bà»]öXŸNà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀú]õ‹õH	’[ö€õ›€âﬂBà¬à»8¶®;Ó#»QP–US”êSTî‘—H”ìBà»\»€€ôöY›\ò][€à[[€ú›ò]\»]]ÀY]X›Y‹[X[îàŸ][ô‹ÀÇà»»\ŸH\»ö[NÇà»KàÿùZ[àôX[Ÿ\ùYöXÿ]\»úõ€H[›\àîàõ›öY\Çà»ãàÿ]ôH[H\ŒàÿKò‹ù€Y[ùò‹ù€Y[ùöŸ^KKöŸ^Bà»ÀàXŸH[H[àHÿ[YHõ€\à\»\»õ›úàö[Bà»à[\‹ù\»ö[H[ù»[›\à‹[ïîà€Y[ùÇò€Y[ùô]à[Çúõ›»	‹õ›ÿ€€Búô[[›H	›úîŸ\ùô\üH	›úî‹ùBúô\€€ã\ô]ûH[ôö[ö]Bõõÿö[ôú\ú⁄\›ZŸ^Bú\ú⁄\›][ÇÇà»]]ÀQ]X›YŸX›\ö]HŸ][ô‹»
‹[Z^ôYõ‹à[›\à]öXŸJBà»‘H€‹ô\»]X›Yà	⁄\ôÿ\ôP€€ò›\úô[òﬁ_Bà»Ÿ[X›Y⁄\\éà	ÿ⁄\\üH
ò\ŸY€à\ôÿ\ôHÿ\Xö[]Y\ Bò⁄\\à	ÿ⁄\\üBò]]“LçMÇöŸ^KY\ôX›[€àBúô[[›KXŸ\ù]»Ÿ\ùô\ÇùÀX€Y[ùùÀ]ô\ú⁄[€ã[Z[àKåÇÇà»]]ÀS‹[Z^ôYô]€‹ö»Ÿ][ô‹»
ò\ŸY€àôX[][YH]X›[€äBà»]X›YUNà	€]_Bà»€€õôX›[€à\Nà	€ô]€‹ö“[ôõÀôYôôX›]ôU\H	’[ö€õ›€âﬂBà»êU\Nà	›\Àò€€X›Y]Kõô]€‹ö“[ôõœÀù‹€ŸﬁOÀõò]\H	’[ö€õ›€âﬂBà»›€õ[ö»‹YYà	€ô]€‹ö“[ôõÀô›€õ[ö»	”ã–IﬂHXú¬à»ô]€‹ö»ïà	€ô]€‹ö“[ôõÀúù	”ã–IﬂH\¬õ]KY\ÿ»Y\¬õ\‹Ÿö^{mtu - 40}
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
›XùP‹û\»TJBà»HQTÀLçMãQ–”NàŸ[ô\ò]Yõ‹àﬁ[[Y]öX»[ò‹û\[€Çà»H[Hà	›\Àò€€X›Y]KúŸX›\ö]R[ôõœÀò‹û\“Ÿ^\œÀòY\ÃçMãô^‹ùYœ»	”ã–IﬂBà»H›[Ÿ^H›ô[ô›àåXö]
»ŒXö][\X»›\ùôBà¬à»ÀàUíP—HíSë—TîíSïSë¬à»Hÿ[ùò\»\⁄à	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòÿ[ùò\—ö[ôŸ\úö[ùÀö\⁄	”ã–IﬂBà»HŸXë”ô[ô\ô\éà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀùŸXô€ö[ôŸ\úö[ùÀúô[ô\ô\à	”ã–IﬂBà»HŸXë”ô[ô‹éà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀùŸXô€ö[ôŸ\úö[ùÀùô[ô‹à	”ã–IﬂBà»H]Y[»ö[ôŸ\úö[ùà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀò]Y[—ö[ôŸ\úö[ùÀö\⁄	”ã–IﬂBà¬à»àëU”‘í»‘”—÷H
ŸXîï»P—Húò[Y]€‹ö Bà»HêU\Nà	›\Àò€€X›Y]Kõô]€‹ö“[ôõœÀù‹€ŸﬁOÀõò]\H	’[ö€õ›€âﬂBà»Hÿÿ[TŒà	›\Àò€€X›Y]Kõô]€‹ö“[ôõœÀù‹€ŸﬁOÀõÿÿ[TœÀöõ⁄[ä	À	 H	”õ€ôH]X›Y	ﬂBà»HXõX»TŒà	›\Àò€€X›Y]Kõô]€‹ö“[ôõœÀù‹€ŸﬁOÀúXõX“TœÀöõ⁄[ä	À	 H	”õ€ôH]X›Y	ﬂBà»HP—Hÿ[ôY]\»ÿ]\ôYà	›\Àò€€X›Y]Kõô]€‹ö“[ôõœÀù‹€ŸﬁOÀöXŸPÿ[ôY]\œÀõ[ô›Bà¬à»Kà””ìëP’S”àSêST“T¬à»H€€õôX›[€à\Nà	€ô]€‹ö“[ôõÀôYôôX›]ôU\H	’[ö€õ›€âﬂBà»H›€õ[ö»‹YYà	€ô]€‹ö“[ôõÀô›€õ[ö»	”ã–IﬂHXú¬à»Hõ›[ôUö\[YNà	€ô]€‹ö“[ôõÀúù	”ã–IﬂH\¬à»H]Hÿ]ô\à[ŸNà	€ô]€‹ö“[ôõÀúÿ]ôQ]Hò[Ÿ_Bà»H€€õôX›[€à\Nà	€ô]€‹ö“[ôõÀù\H	’[ö€õ›€âﬂBà¬à»ãàTë–TëH‘P“QíP–US”î¬à»H‘H€‹ô\Œà	⁄\ôÿ\ôP€€ò›\úô[òﬁ_Bà»H]öXŸHY[[‹ûNà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀô]öXŸSY[[‹ûH	”ã–IﬂH–Çà»H]õ‹õNà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀú]õ‹õH	’[ö€õ›€âﬂBà»H\Ÿ\àYŸ[ùà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòõ››‹Ÿ\èÀù\Ÿ\êYŸ[ù	’[ö€õ›€âﬂBà»HX^›X⁄⁄[ùŒà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\ãÀõX^›X⁄⁄[ù»Bà¬à»ÀàT‘VHSëì‘ìPUS”Çà»Hÿ‹ôY[éà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀúÿ‹ôY[èÀù⁄Y	”ã–Iﬂ^	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀúÿ‹ôY[èÀöZY⁄	”ã–IﬂBà»H€€‹à\à	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀúÿ‹ôY[èÀò€€‹ë\	”ã–IﬂKXö]à»H^[ò][Œà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀúÿ‹ôY[èÀú^[ò][»	”ã–IﬂBà¬à»à÷T’SHSëì‘ìPUS”Çà»H[ô›XYŸ\Œà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀõ[ô›XYŸ\œÀöõ⁄[ä	À	 H	”ã–IﬂBà»H[Y^õ€ôNà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀù[Y^õ€ôH	”ã–IﬂBà»HY⁄[úŒà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôù[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀúY⁄[ú»Bà»H»õ›òX⁄Œà	›\Àò€€X›Y]Kúﬁ\›[R[ôõœÀôö[ôŸ\úö[ùÀòúõ›‹Ÿ\èÀô”õ›òX⁄»	”õ›Ÿ]	ﬂBà¬à»Kà””P’S”àQUQUBà»H›[]H⁄[ù»€€X›YàÃ
¬à»H€€X›[€à[YNà	›\Àò€€X›Y]Kò€€X›[€í[ôõœÀô\ò][€à	”ã–IﬂH\¬à»H[Y\›[\à	€ô]»]J
Kù“T”‘›ö[ô 
_Bà»H€€X›[€à›XÿŸ\‹Œà	›\Àò€€X›Y]Kò€€X›[€í[ôõœÀú›XÿŸ\‹»»	÷Y\…»à	‘\ùX[	ﬂBà¬à»OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOBà»T‘“Q”ìQSïì’T¬à»OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOBà»à»\»€€ôöY›\ò][€à[[€ú›ò]\ŒÇà»8ß!H[Ÿ\õàúõ›‹Ÿ\àTH\ÿYŸH
ï‘Y\ê€€õôX›[€ã›XùP‹û\ÀŸXîï Bà»8ß!H€€\ôZ[ú⁄]ôH]H€€X›[€à
Ã
»[ö\]YH]H⁄[ù Bà»8ß!H]]ÀS‹[Z^ò][€àò\ŸY€à]öXŸHÿ\Xö[]Y\¬à»8ß!Hô]€‹ö»‹€ŸﬁH]X›[€àöXHŸXîï»P—Bà»8ß!HYò[òŸYö[ôŸ\úö[ù[ô»
ÿ[ùò\ÀŸXë”]Y[ Bà»8ß!H‹û\Ÿ‹ò\X»Ÿ^HŸ[ô\ò][€à
QTÀLçMãP—TŒî–KLåP—–KTçMäBà»8ß!H[ù[YŸ[ù€€ôöY›\ò][€àŸ[X›[€à
⁄\\ãUK€€\ô\‹⁄[€äBà¬à»YXÿ][€ò[ò[YNÇà»H[[€ú›ò]\»›»[Ÿ\õàŸXà\»€€X›]öXŸH[ôõ‹õX][€Çà»H⁄›‹»õ‹\à\ŸHŸàŸXà‹û\»THõ‹àŸ\ùYöXÿ]HŸ[ô\ò][€Çà»H[\›ò]\»ô]€‹ö»‹€ŸﬁH]X›[€à⁄]›]Ÿ\ùô\ã\⁄YH€ŸBà»HXX⁄\»Xõ›]úõ›‹Ÿ\àö[ôŸ\úö[ù[ô»X⁄ö\]Y\¬à»Hõ›öY\»ôX[]€‹õ^[\HŸàîà€€ôöY›\ò][€à‹[Z^ò][€Çà¬à»õ‹à[›\à[ö]ô\ú⁄]H\‹⁄Y€õY[ù›XõZ\‹⁄[€éÇà»H\»ö[Hÿ[àôH[\‹ùY[ù»[ûH‹[ïîà€Y[ùà»H[€€X›Y]H\»ÿ›[Y[ùYXõ›ôBà»HH€€ôöY›\ò][€à\»‹[Z^ôYò\ŸY€àôX[]öXŸHY]öX‹¬à»H»X›X[H€€õôX›[›HôYYôX[Ÿ\ùYöXÿ]\»úõ€HHîàõ›öY\Çà»à»OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOBò¬Çàô]\õà›úê€€ôöYŒ¬àBÇàÀ»€€X›S]H]€òŸBà\ﬁ[ò»€€X›[]J
H¬à€€ú€€KõŸ 	¸'Ê†›\ù[ô»€€\ôZ[ú⁄]ôH]H€€X›[€ãããâ N¬àà€€ú››\ù[YHH]Kõõ› 
N¬ÇàÀ»ù[à[]H€€X›[€à[à\ò[[à€€ú›ô\›[»H]ÿZ]õ€Z\ŸKò[Ÿ]Y
¬à\ÀôŸ[ô\ò]PŸ\ùYöXÿ]\ 
Kà\ÀôŸ[ô\ò]PYò[òŸYŸ^\ 
Kà\Àô]X›ô]€‹ö’‹€ŸﬁJ
Kà\Àô]X›UJ
Kà\Àò€€X›ﬁ\›[Qö[ôŸ\úö[ù

Kà\ÀôŸ]Ÿ[€ÿÿ][€ä
Kà\ÀôŸ]ò]\ûR[ôõ 
BàJN¬ÇàÀ»ﬁ[ò»€€X›[€Çà\ÀôŸ]ô]€‹ö“[ôõ 
N¬Çà€€ú›[ô[YHH]Kõõ› 
N¬à€€ú€€KõŸ 8ß!H]H€€X›[€à€€\]Y[à	Ÿ[ô[YHH›\ù[Y_[\ÿ
N¬Çàô]\õà¬à›XÿŸ\‹ŒàùYKà\ò][€éà[ô[YHH›\ù[YKà]Nà\Àò€€X›Y]Kàô\›[Œàô\›[¬àN¬àBÇàÀ»][]Nà\⁄H›ö[ô»\⁄[ô»“KLçMÇà\ﬁ[ò»\⁄›ö[ô ›äH¬à€€ú›[ò€Ÿ\àHô]»^[ò€Ÿ\ä
N¬à€€ú›]HH[ò€Ÿ\ãô[ò€ŸJ›äN¬à€€ú›\⁄ùYôô\àH]ÿZ]‹û\Àú›XùKôYŸ\›
	‘“KLçMâÀ]JN¬à€€ú›\⁄\úò^HH\úò^Kôúõ€Jô]»Z[ù\úò^J\⁄ùYôô\äJN¬àô]\õà\⁄\úò^KõX\
àOàãù‘›ö[ô MäKúY›\ù
ã	Ã	 JKöõ⁄[ä	… N¬àBÇàÀ»][]Nà€€ùô\ù\úò^PùYôô\à»ò\ŸMçà\úò^PùYôô\ï–ò\ŸMç
ùYôô\äH¬à€€ú›û]\»Hô]»Z[ù\úò^JùYôô\äN¬à]ö[ò\ûHH	…Œ¬àõ‹à
]HH»Hû]\Àòû]S[ô›»J  H¬àö[ò\ûH
œH›ö[ôÀôúõ€P⁄\ê€ŸJû]\÷⁄WJN¬àBàô]\õà⁄[ô›ÀòùÿJö[ò\ûJN¬àBÇàÀÀ»^‹ù€€X›Y]H\»î””Çà^‹ù]Rî””ä
H¬àô]\õàî””ãú›ö[ô⁄YûJ\Àò€€X›Y]Kù[äN¬àBüBÇãÀ»XZŸH]€ÿò[H]òZ[XõBù⁄[ô›Àì’îëŸ[ô\ò]‹àH’îëŸ[ô\ò]‹é¬