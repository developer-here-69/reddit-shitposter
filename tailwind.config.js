/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        reddit: {
          dark: '#0E1113',
          card: '#12161A',
          hover: '#1A1D20',
          border: '#272B2F',
          orange: '#FF4500',
          orangeHover: '#E03D00',
          textMuted: '#82959B',
          textLight: '#D7DADC',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
