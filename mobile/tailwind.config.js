/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(38, 92%, 55%)",
          foreground: "hsl(220, 20%, 7%)",
        },
        secondary: {
          DEFAULT: "hsl(220, 15%, 94%)",
          foreground: "hsl(220, 20%, 15%)",
        },
        accent: {
          DEFAULT: "hsl(175, 65%, 45%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        muted: {
          DEFAULT: "hsl(220, 15%, 90%)",
          foreground: "hsl(220, 10%, 40%)",
        },
        card: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(220, 20%, 7%)",
        },
        border: "hsl(220, 15%, 88%)",
      },
    },
  },
  plugins: [],
};
