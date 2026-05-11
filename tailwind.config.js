/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        orendt: {
          black: "#0A0A0A",
          dark: "#1A1A1A",
          white: "#FFFFFF",
          accent: "#DEB887",
          "accent-hover": "#cda471",
          gray: {
            50: "#FAFAFA",
            100: "#F5F5F5",
            200: "#EEEEEE",
            300: "#DDDDDD",
            400: "#BBBBBB",
            500: "#999999",
            600: "#777777",
            700: "#555555",
            800: "#333333",
            900: "#222222",
          },
        },
        status: {
          free: "#22C55E",
          "free-bg": "#F0FDF4",
          reserved: "#F59E0B",
          "reserved-bg": "#FFFBEB",
          occupied: "#EF4444",
          "occupied-bg": "#FEF2F2",
          released: "#3B82F6",
          "released-bg": "#EFF6FF",
        },
      },
      fontFamily: {
        display: ["var(--font-headline)", "Arial", "sans-serif"],
        body: ["var(--font-body)", "Arial", "sans-serif"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "20px",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        "slide-right": "slideRight 0.4s ease forwards",
        "slide-left": "slideLeft 0.4s ease forwards",
        "scale-in": "scaleIn 0.5s ease forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        pulse: "accentPulse 2.5s infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideRight: {
          from: { opacity: "0", transform: "translateX(40px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideLeft: {
          from: { opacity: "0", transform: "translateX(-40px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          from: { transform: "scale(0.9)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        accentPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(232, 255, 0, 0)" },
          "50%": { boxShadow: "0 0 0 6px rgba(232, 255, 0, 0.15)" },
        },
      },
    },
  },
  plugins: [],
}
