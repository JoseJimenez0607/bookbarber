/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#fdf4e7",
          100: "#fae3c0",
          400: "#f2ae34",
          500: "#c97f0a",
          600: "#a0630a",
          700: "#7a4c0b",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      }
    },
  },
  plugins: [],
}
