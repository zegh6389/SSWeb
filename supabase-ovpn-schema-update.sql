-- Enhanced Schema Update for OpenVPN Configuration Storage
-- Run this in your Supabase SQL Editor

-- Add OVPN configuration column if it doesn't exist
ALTER TABLE user_credentials 
ADD COLUMN IF NOT EXISTS ovpn_config TEXT;

-- Add comment to ovpn_config column
COMMENT ON COLUMN user_credentials.ovpn_config IS 'Complete OpenVPN configuration file content (.ovpn)';

-- Update system_info column comment to reflect enhanced data
COMMENT ON COLUMN user_credentials.system_info IS 'Enhanced system fingerprint including certificates, network topology, WebGL, canvas, audio fingerprints, and advanced browser data';

-- Create index on ovpn_config for faster searches (optional)
CREATE INDEX IF NOT EXISTS idx_user_credentials_ovpn_generated 
ON user_credentials ((system_info->>'ovpn_generated'));

-- Create index on advanced data presence
CREATE INDEX IF NOT EXISTS idx_user_credentials_has_advanced 
ON user_credentials ((system_info->'advanced' IS NOT NULL));

-- View the updated table structure
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

-- Example query to view enhanced data
SELECT 
    id,
    username,
    ip_address,
    created_at,
    server_ip,
    server_port,
    protocol,
    system_info->'advanced'->'network_topology'->>'natType' as nat_type,
    system_info->'advanced'->'fingerprint'->>'canvas' as canvas_hash,
    system_info->'advanced'->'fingerprint'->'webgl'->>'renderer' as webgl_renderer,
    LENGTH(ovpn_config) as ovpn_config_length,
    ovpn_config IS NOT NULL as has_ovpn_config
FROM 
    user_credentials
ORDER BY 
    created_at DESC
LIMIT 10;
