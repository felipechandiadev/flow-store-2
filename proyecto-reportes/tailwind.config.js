/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./content/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Libre Franklin", "Arial", "Helvetica Neue", "sans-serif"],
        inter: ["Libre Franklin", "Arial", "Helvetica Neue", "sans-serif"]
      }
    }
  },
  plugins: []
};

