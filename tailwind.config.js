/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#1d3763', // Color principal
          600: '#1a3159',
          700: '#162b4f',
          800: '#102a43',
          900: '#0a1929',
        },
        trustify: {
          blue: '#1d3763',
          light: '#2d4d85',
          dark: '#152642'
        }
      },
      fontFamily: {
        'nunito': ['Nunito Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}