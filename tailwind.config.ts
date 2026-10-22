import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf4",
          100: "#d6f5e3",
          500: "#16a34a",
          600: "#15803d",
          700: "#166534",
        },
        sun: { 500: "#f59e0b" },
      },
    },
  },
  plugins: [],
};

export default config;
