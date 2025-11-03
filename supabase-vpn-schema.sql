-- Drop the existing table if you want to recreate it
-- DROP TABLE IF EXISTS user_credentials;

-- Create the enhanced user_credentials table with VPN configuration
CREATE TABLE IF NOT EXISTS user_credentials (
  id BIGSERIAL PRIMARY KEY,
  
  -- User credentials
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  
  -- IP and timestamp
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- VPN Configuration - Certificates
  ca_crt TEXT,           -- CA certificate content
  client_crt TEXT,       -- Client certificate content
  client_key TEXT,       -- Client private key content
  ta_key TEXT,           -- TLS security key (optional but recommended)
  
  -- VPN Configuration - Server details
  server_ip TEXT DEFAULT '206.45.29.181',
  server_port INTEGER DEFAULT 1194,
  protocol TEXT DEFAULT 'udp',  -- 'udp' or 'tcp'
  
  -- Auto-detected system information (JSON)
  system_info JSONB,
  
  -- Additional metadata
  config_name TEXT,      -- Optional: name for this VPN config
  notes TEXT             -- Optional: any additional notes
);

-- Enable Row Level Security
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts for everyone
CREATE POLICY "Enable insert for all users" ON user_credentials
  FOR INSERT WITH CHECK (true);

-- Create policy to allow select for authenticated users (optional)
CREATE POLICY "Enable read for authenticated users" ON user_credentials
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_credentials_username ON user_credentials(username);
CREATE INDEX IF NOT EXISTS idx_user_credentials_created_at ON user_credentials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_credentials_ip ON user_credentials(ip_address);

-- Add comments for documentation
COMMENT ON TABLE user_credentials IS 'Stores user credentials and VPN configuration details';
COMMENT ON COLUMN user_credentials.ca_crt IS 'CA certificate content';
COMMENT ON COLUMN user_credentials.client_crt IS 'Client certificate content';
COMMENT ON COLUMN user_credentials.client_key IS 'Client private key content';
COMMENT ON COLUMN user_credentials.ta_key IS 'TLS security key (optional but recommended)';
COMMENT ON COLUMN user_credentials.server_ip IS 'VPN server IP address';
COMMENT ON COLUMN user_credentials.server_port IS 'VPN server port (default 1194)';
COMMENT ON COLUMN user_credentials.protocol IS 'VPN protocol: udp or tcp';
