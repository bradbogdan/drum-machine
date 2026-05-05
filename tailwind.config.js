/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        ripple: "ripple 600ms ease-out",
        glow: "glow 400ms ease-out",
      },
      keyframes: {
        ripple: {
          "0%": { transform: "scale(0.8)", opacity: "0.9" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        glow: {
          "0%": { filter: "brightness(1.8) saturate(1.6)", transform: "scale(0.96)" },
          "100%": { filter: "brightness(1) saturate(1)", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
