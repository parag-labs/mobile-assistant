// Dynamic Expo config. When PAGES=1 (the GitHub Pages web export) the app is served under the
// repo subpath, so we set experiments.baseUrl accordingly. The web bundle is a static export
// that runs the whole assistant engine client-side - no backend needed.
const isPages = process.env.PAGES === "1";

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Mobile Life Assistant",
  slug: "mobile-assistant",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "mobileassistant",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: { supportsTablet: true },
  android: { predictiveBackGestureEnabled: false },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  plugins: ["expo-router"],
  experiments: {
    typedRoutes: true,
    ...(isPages ? { baseUrl: "/mobile-assistant" } : {}),
  },
};
