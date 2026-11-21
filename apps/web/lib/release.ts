/**
 * Where people get the app. The QR codes in the presentation point at /download, so a new build only
 * changes this file (or the env vars), never the printed codes.
 */
export const RELEASE = {
  /** Latest Android preview build (APK) from EAS. Override with ANDROID_APK_URL. */
  androidApk: process.env.ANDROID_APK_URL || 'https://expo.dev/artifacts/eas/9XmT-Dhi0Avxnpx3UAqXetIP8fWg80MV050kdmWlTV4.apk',
  /** App Store / Google Play listings, once published. */
  appStore: process.env.APP_STORE_URL || null,
  googlePlay: process.env.GOOGLE_PLAY_URL || null,
};
