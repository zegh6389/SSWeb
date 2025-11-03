package com.ovpn.generator;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.text.format.Formatter;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.InetAddress;
import java.util.List;

@CapacitorPlugin(name = "NetworkConfig")
public class NetworkConfigPlugin extends Plugin {

    @PluginMethod
    public void getNetworkConfig(PluginCall call) {
        JSObject result = new JSObject();
        
        try {
            Context context = getContext();
            WifiManager wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            ConnectivityManager connectivityManager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            
            if (wifiManager != null) {
                WifiInfo wifiInfo = wifiManager.getConnectionInfo();
                
                // IP Address
                int ipAddress = wifiInfo.getIpAddress();
                String ipString = Formatter.formatIpAddress(ipAddress);
                result.put("ipAddress", ipString);
                
                // SSID
                String ssid = wifiInfo.getSSID();
                if (ssid != null) {
                    ssid = ssid.replace("\"", "");
                }
                result.put("ssid", ssid);
                
                // BSSID (Router MAC)
                result.put("bssid", wifiInfo.getBSSID());
                
                // Link Speed
                result.put("linkSpeed", wifiInfo.getLinkSpeed());
                
                // RSSI (Signal Strength)
                result.put("rssi", wifiInfo.getRssi());
                
                // Frequency
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                    result.put("frequency", wifiInfo.getFrequency());
                }
            }
            
            if (connectivityManager != null) {
                Network network = connectivityManager.getActiveNetwork();
                if (network != null) {
                    LinkProperties linkProperties = connectivityManager.getLinkProperties(network);
                    
                    if (linkProperties != null) {
                        // Gateway
                        List<InetAddress> routes = linkProperties.getRoutes().stream()
                            .map(route -> route.getGateway())
                            .filter(gateway -> gateway != null)
                            .collect(java.util.stream.Collectors.toList());
                        
                        if (!routes.isEmpty()) {
                            result.put("gateway", routes.get(0).getHostAddress());
                        }
                        
                        // DNS Servers
                        List<InetAddress> dnsServers = linkProperties.getDnsServers();
                        if (dnsServers.size() > 0) {
                            result.put("dns1", dnsServers.get(0).getHostAddress());
                        }
                        if (dnsServers.size() > 1) {
                            result.put("dns2", dnsServers.get(1).getHostAddress());
                        }
                        
                        // Interface Name
                        result.put("interfaceName", linkProperties.getInterfaceName());
                        
                        // MTU
                        result.put("mtu", linkProperties.getMtu());
                    }
                    
                    NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(network);
                    if (capabilities != null) {
                        result.put("hasWifi", capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI));
                        result.put("hasCellular", capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR));
                        result.put("hasEthernet", capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
                        
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                            result.put("downlinkBandwidth", capabilities.getLinkDownstreamBandwidthKbps());
                            result.put("uplinkBandwidth", capabilities.getLinkUpstreamBandwidthKbps());
                        }
                    }
                }
            }
            
            call.resolve(result);
            
        } catch (Exception e) {
            call.reject("Error getting network config: " + e.getMessage());
        }
    }
}
