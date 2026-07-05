import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.filhosdoreibjj.app",
  appName: "Filhos do Rei BJJ",
  webDir: "client/dist",
  server: {
    androidScheme: "https"
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0D0D0D",
      showSpinner: false
    }
  }
};

export default config;
