/**
 * Where people get the app. The QR codes in the presentation point at /download, so a new build only
 * changes this file (or the env vars), never the printed codes.
 */
export const RELEASE = {
  /** Latest Android preview build (APK) from EAS. Override with ANDROID_APK_URL. */
  androidApk: process.env.ANDROID_APK_URL || 'https://expo.dev/artifacts/eas/Vz1ir1GMlr5JUPhonmSOfxR58ttu0_mld1HiOsncWMw.apk',
  /** iPhone pilot build on TestFlight (public link; open once Apple approves the beta). Override with TESTFLIGHT_URL. */
  testFlight: process.env.TESTFLIGHT_URL || 'https://testflight.apple.com/join/tqhXGdq6',
  /** App Store / Google Play listings, once published. */
  appStore: process.env.APP_STORE_URL || null,
  googlePlay: process.env.GOOGLE_PLAY_URL || null,
};
