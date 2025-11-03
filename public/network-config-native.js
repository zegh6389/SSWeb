// Capacitor Network Config Plugin Wrapper
class NetworkConfigNative {
    async getNetworkConfig() {
        try {
            // Check if running as Capacitor app
            if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
                console.log('Not running as native app - network config not available');
                return null;
            }

            // Import NetworkConfig plugin
            const { NetworkConfig } = window.Capacitor.Plugins;
            
            if (!NetworkConfig) {
                console.error('NetworkConfig plugin not available');
                return null;
            }

            // Get network configuration
            const config = await NetworkConfig.getNetworkConfig();
            
            return {
                // IP Settings (from screenshot)
                ipAddress: config.ipAddress,           // "10.82.33.136"
                gateway: config.gateway,               // "10.82.0.1"
                subnetMask: this.calculateSubnetMask(config.ipAddress, config.gateway),
                networkPrefixLength: this.calculatePrefixLength(config.ipAddress, config.gateway),
                dns1: config.dns1,                     // "10.10.92.99"
                dns2: config.dns2,                     // "10.10.92.98"
                
                // WiFi Info
                ssid: config.ssid,
                bssid: config.bssid,
                linkSpeed: config.linkSpeed + ' Mbps',
                rssi: config.rssi + ' dBm',
                frequency: config.frequency + ' MHz',
                
                // Connection Type
                connectionType: config.hasWifi ? 'wifi' : (config.hasCellular ? 'cellular' : 'ethernet'),
                hasWifi: config.hasWifi,
                hasCellular: config.hasCellular,
                hasEthernet: config.hasEthernet,
                
                // Performance
                downlinkBandwidth: config.downlinkBandwidth + ' Kbps',
                uplinkBandwidth: config.uplinkBandwidth + ' Kbps',
                mtu: config.mtu,
                
                // Interface
                interfaceName: config.interfaceName,
                
                // Auto-reconnect (always true for WiFi)
                autoReconnect: true
            };
            
        } catch (error) {
            console.error('Failed to get network config:', error);
            return null;
        }
    }
    
    calculateSubnetMask(ip, gateway) {
        // Simple subnet calculation based on IP class
        if (!ip) return '255.255.255.0';
        
        const ipParts = ip.split('.');
        const gwParts = gateway ? gateway.split('.') : [];
        
        // Check if Class A, B, or C network
        if (ipParts[0] === gwParts[0] && ipParts[1] === gwParts[1]) {
            return '255.255.0.0';  // /16 network
        } else if (ipParts[0] === gwParts[0]) {
            return '255.0.0.0';    // /8 network
        } else {
            return '255.255.255.0'; // /24 network
        }
    }
    
    calculatePrefixLength(ip, gateway) {
        const mask = this.calculateSubnetMask(ip, gateway);
        const maskParts = mask.split('.');
        
        let prefix = 0;
        for (let part of maskParts) {
            const num = parseInt(part);
            prefix += (num.toString(2).match(/1/g) || []).length;
        }
        
        return prefix;
    }
}

// Make it globally available
window.NetworkConfigNative = new NetworkConfigNative();
