import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "sans-serif"]
      },
      backgroundImage: {
        "cosmic-gradient":
          "radial-gradient(1200px 600px at 20% 0%, rgba(147,51,234,0.25), transparent), radial-gradient(800px 400px at 90% 10%, rgba(56,189,248,0.25), transparent), radial-gradient(1000px 500px at 30% 100%, rgba(250,204,21,0.15), transparent)"
      }
    }
  },
  plugins: []
};
export default config;
