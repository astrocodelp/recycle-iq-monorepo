/**
 * Marks hardware features as optional in the Android manifest so Google Play does not hide the app from
 * devices without them (tablets, Chromebooks, Android XR, phones without GPS, ...). Play infers several of
 * these from permissions and from the portrait orientation, and treats inferred features as required:
 * - android.hardware.screen.portrait  ← "orientation": "portrait"
 * - android.hardware.wifi             ← ACCESS_WIFI_STATE (the model downloads only on Wi-Fi)
 * - camera, location, microphone      ← CAMERA, ACCESS_*_LOCATION, RECORD_AUDIO
 * The app works without each of them: pick list instead of the camera, neighbourhood picked by hand,
 * typing instead of voice, and the model downloads on the first scan instead of on Wi-Fi.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const OPTIONAL = [
  'android.hardware.screen.portrait',
  'android.hardware.wifi',
  'android.hardware.camera',
  'android.hardware.camera.any',
  'android.hardware.camera.autofocus',
  'android.hardware.location',
  'android.hardware.location.gps',
  'android.hardware.location.network',
  'android.hardware.microphone',
  'android.hardware.touchscreen',
];

module.exports = function withOptionalFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ ?? {};
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] ?? 'http://schemas.android.com/tools';
    const features = (manifest['uses-feature'] = manifest['uses-feature'] ?? []);
    for (const name of OPTIONAL) {
      const existing = features.find((f) => f.$?.['android:name'] === name);
      if (existing) {
        existing.$['android:required'] = 'false';
        existing.$['tools:replace'] = 'android:required';
      } else {
        features.push({ $: { 'android:name': name, 'android:required': 'false', 'tools:replace': 'android:required' } });
      }
    }
    return cfg;
  });
};
