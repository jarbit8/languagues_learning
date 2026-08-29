/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Color de acento del curso, consistente en toda la app
        en: { DEFAULT: '#2563eb', soft: '#dbeafe', dark: '#1e40af' }
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
}
