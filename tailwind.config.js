/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Color por idioma, consistente en toda la app
        en: { DEFAULT: '#2563eb', soft: '#dbeafe', dark: '#1e40af' },
        fr: { DEFAULT: '#e11d48', soft: '#ffe4e6', dark: '#9f1239' }
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
}
