# Building the OVPN Generator Native Android App

## Overview
This project has been converted to a Capacitor native Android app to access network configuration details that browsers cannot reach, including:
- **Gateway address** (e.g., 10.82.0.1)
- **DNS servers** (e.g., 10.10.92.99, 10.10.92.98)
- **WiFi SSID** (network name)
- **BSSID** (router MAC address)
- **Subnet mask / Network prefix length**
- **MTU** (Maximum Transmission Unit)
- **Link speed, signal strength, frequency**
- Plus all 70+ browser data points from the PWA version

## Prerequisites

### 1. Install Android Studio
Download from: https://developer.android.com/studio

During installation, make sure to install:
- ✅ Android SDK
- ✅ Android SDK Platform
- ✅ Android Virtual Device
- ✅ Android SDK Build-Tools
- ✅ Android SDK Platform-Tools

### 2. Install Java Development Kit (JDK)
- JDK 11 or higher required
- Download from: https://www.oracle.com/java/technologies/downloads/
- Or use OpenJDK: https://adoptium.net/

### 3. Set Environment Variables (Windows)

Add these to your system PATH:
```
C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools
C:\Users\YourName\AppData\Local\Android\Sdk\tools
C:\Program Files\Java\jdk-11\bin
```

Create ANDROID_HOME variable:
```
ANDROID_HOME = C:\Users\YourName\AppData\Local\Android\Sdk
```

Create JAVA_HOME variable:
```
JAVA_HOME = C:\Program Files\Java\jdk-11
```

## Building the APK

### Method 1: Using Android Studio (Recommended)

1. **Open the project in Android Studio**
   ```powershell
   cd d:\snapchat\SSWeb
   npx cap open android
   ```
   
   This will open the Android project in Android Studio.

2. **Wait for Gradle sync** to complete (first time may take 5-10 minutes)

3. **Build the APK**
   - Click **Build** menu → **Build Bundle(s) / APK(s)** → **Build APK(s)**
   - Or use shortcut: `Ctrl + Shift + A` → type "Build APK" → press Enter

4. **Find the APK**
   - After build completes, click "locate" in the notification
   - APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Method 2: Using Command Line (Alternative)

1. **Build with Gradle**
   ```powershell
   cd d:\snapchat\SSWeb\android
   .\gradlew assembleDebug
   ```

2. **Find the APK**
   - Location: `android/app/build/outputs/apk/debug/app-debug.apk`

## Testing the APK

### Option A: Test on Physical Android Device

1. **Enable Developer Options**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options
   - Enable "USB Debugging"

2. **Connect Device**
   - Connect phone via USB
   - Allow USB debugging when prompted

3. **Install APK**
   ```powershell
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Test Network Config Collection**
   - Open the app on your phone
   - Sign in with any credentials
   - Check Supabase database for `native_network_config` field

### Option B: Test on Android Emulator

1. **Create Virtual Device**
   - In Android Studio: Tools → AVD Manager
   - Click "Create Virtual Device"
   - Select a device (e.g., Pixel 5)
   - Download a system image (e.g., API 33 - Android 13)
   - Click Finish

2. **Run the App**
   - Click the green play button in Android Studio
   - Or run: `npx cap run android`

## Expected Network Data Collection

When running on a real device with WiFi connection, the app will collect:

```json
{
  "native_network_config": {
    "ipAddress": "10.82.33.136",
    "gateway": "10.82.0.1",
    "dns1": "10.10.92.99",
    "dns2": "10.10.92.98",
    "ssid": "YourWiFiNetwork",
    "bssid": "xx:xx:xx:xx:xx:xx",
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
    "autoReconnect": true
  }
}
```

## Troubleshooting

### Gradle Build Fails
- Make sure ANDROID_HOME and JAVA_HOME are set correctly
- Try: `cd android` then `.\gradlew clean`
- Then rebuild: `.\gradlew assembleDebug`

### "Permission Denied" Errors
- Make sure you've granted location permissions in AndroidManifest.xml (already done)
- On Android 10+, location permission is required to access WiFi SSID

### Plugin Not Found
- Make sure MainActivity.java registers the plugin:
  ```java
  registerPlugin(NetworkConfigPlugin.class);
  ```
- This is already configured in your project

### Web Assets Not Updated
- Run sync again:
  ```powershell
  npx cap sync android
  ```

## Deployment Options

### Option 1: Direct Download
- Host the APK on your website or GitHub releases
- Users can download and install directly (requires "Unknown Sources" enabled)

### Option 2: Google Play Store
- Requires a Google Play Developer account ($25 one-time fee)
- Create a release build (signed APK or AAB)
- Submit for review (can take 1-3 days)

### Option 3: Internal Distribution
- Use Firebase App Distribution
- Or email the APK directly to users

## Building Release APK (For Production)

1. **Generate Keystore**
   ```powershell
   keytool -genkey -v -keystore ovpn-release-key.keystore -alias ovpn-generator -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure Signing**
   - Edit `android/app/build.gradle`
   - Add signing configuration

3. **Build Release APK**
   ```powershell
   cd android
   .\gradlew assembleRelease
   ```

4. **Find Release APK**
   - Location: `android/app/build/outputs/apk/release/app-release.apk`

## Technical Details

### Custom Plugin Architecture
The app uses a custom Capacitor plugin (`NetworkConfigPlugin.java`) that:
- Accesses Android's `WifiManager` for WiFi details
- Uses `ConnectivityManager` for network state
- Parses `LinkProperties` for gateway and DNS
- Returns data via Capacitor JavaScript bridge

### Permissions Required
```xml
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### Bridge Code
JavaScript calls the native plugin via:
```javascript
const { NetworkConfig } = window.Capacitor.Plugins;
const config = await NetworkConfig.getNetworkConfig();
```

## Files Structure

```
SSWeb/
├── android/                          # Native Android project
│   ├── app/
│   │   └── src/
│   │       └── main/
│   │           ├── AndroidManifest.xml
│   │           └── java/com/ovpn/generator/
│   │               ├── MainActivity.java
│   │               └── NetworkConfigPlugin.java
├── public/                           # Web assets
│   ├── index.html
│   ├── style.css
│   ├── ovpn-generator.js
│   ├── script-enhanced.js
│   ├── network-config-native.js     # Capacitor plugin wrapper
│   ├── manifest.json
│   └── service-worker.js
├── capacitor.config.json
└── package.json
```

## Next Steps

1. ✅ Install Android Studio and JDK
2. ✅ Set environment variables
3. ✅ Build APK using Method 1 or Method 2
4. ✅ Test on physical device or emulator
5. ✅ Verify network config data in Supabase
6. ✅ Deploy using preferred method

## Support

For issues:
- Check Android Studio Logcat for errors
- Check browser console (Chrome DevTools) for JavaScript errors
- Verify permissions are granted in device settings
- Make sure you're connected to WiFi (not cellular) for full network details

## Version History

- **v1.0**: PWA with 70+ browser data points
- **v2.0**: Native Android app with network configuration access
