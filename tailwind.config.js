/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#D4A574",
        terracota: "#C1614A",
        oliva: "#7A8B6F",
        crema: "#F5F1E8",
        cream: "#E1E0CC",
      },
      fontFamily: {
        serif: ['"Playfair Display"', "serif"],
        sans: ['"DM Sans"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
