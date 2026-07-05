/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        royal: {
          black: "#0D0D0D",
          gold: "#FFC40F",
          white: "#FFFFFF",
          red: "#E74C3C",
          ink: "#151515",
          panel: "#1B1B1B",
          line: "#2A2A2A",
          muted: "#A7A7A7"
        }
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(255, 196, 15, 0.12), 0 18px 50px rgba(0,0,0,0.32)"
      }
    }
  },
  plugins: []
};
