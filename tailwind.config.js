module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        seriflogo: ['"Playfair Display"', 'serif'],
        heading: ["Poppins", "sans-serif"],
        body: ["Open Sans", "sans-serif"],
      },
      colors: {
        beige: "#f5f5dc",
        brunt: "#8B4513",
        mørkbrun: "#5C4033",
        lysbrun: "#D2B48C",
        hvit: "#ffffff",
        svart: "#000000",
        lysegrå: "#f7f7f7",
        rød: "#e63946",
        'brown-50':  '#f8f5f2',
        'brown-100': '#eadfd2',
        'brown-200': '#dac7af',
        'brown-400': '#b19777',
        'brown-500': '#987654',
        'brown-700': '#6d4d28',
        'brown-800': '#4d2d14',
        'brown-900': '#322011',
      },
      animation: {
        fadeIn: "fadeIn 1s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
