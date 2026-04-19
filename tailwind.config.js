/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        court: {
          50: "#fbf5ec",
          100: "#f3e7d3",
          500: "#c97c3b",
          700: "#8e4f20",
          950: "#2f1708"
        },
        slatewarm: {
          950: "#14110f"
        }
      },
      boxShadow: {
        card: "0 18px 40px rgba(20, 17, 15, 0.14)"
      },
      backgroundImage: {
        "court-grid": "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};
