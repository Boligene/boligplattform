export default {
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
        'brown-300': '#c3a882',
        'brown-400': '#b19777',
        'brown-500': '#987654',
        'brown-600': '#8b6f47',
        'brown-700': '#6d4d28',
        'brown-800': '#4d2d14',
        'brown-900': '#322011',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'tap-target': '44px',
      },
      minWidth: {
        'tap-target': '44px',
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
  plugins: [
    function({ addUtilities }) {
      const safeAreaUtilities = {
        '.pt-safe': {
          paddingTop: 'env(safe-area-inset-top)',
        },
        '.pb-safe': {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        '.pl-safe': {
          paddingLeft: 'env(safe-area-inset-left)',
        },
        '.pr-safe': {
          paddingRight: 'env(safe-area-inset-right)',
        },
        '.p-safe': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
      };

      const tapTargetUtilities = {
        '.tap-target': {
          minHeight: '44px',
          minWidth: '44px',
        },
        '.tap-target-lg': {
          minHeight: '48px',
          minWidth: '48px',
        },
      };

      addUtilities(safeAreaUtilities);
      addUtilities(tapTargetUtilities);
    },
  ],
};
