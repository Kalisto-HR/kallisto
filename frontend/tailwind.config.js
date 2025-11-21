/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // green-first palette (B)
        primary: "#1a4d3a",   // background-ish (signin bg)
        brandBlue: "#003A81", // accent blue for headings if needed
        brandGreen: "#006D3E", // main action color
        brandLight: "#5FB22E", // hover / highlight
        card: "#ffffff",
      },
    },
  },
  plugins: [],
};
