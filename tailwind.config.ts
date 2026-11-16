import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121212",
        panel: "#1E1E1E",
        line: "#2E2E2E",
        brand: { DEFAULT: "#E53935", dark: "#C62828" },
        mining: "#29B6F6",
        gold: "#F59E0B",
        muted: "#A3A3A3",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
