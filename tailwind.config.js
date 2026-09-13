/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutro de toda la app: gris con un punto de azul noche. Se redefine `slate` en vez de
        // crear un nombre nuevo porque las pantallas lo usan en más de 400 sitios.
        slate: {
          50: '#f6f7fb',
          100: '#eef0f7',
          200: '#dfe3ef',
          300: '#c5cbe0',
          400: '#9199b8',
          500: '#6b7397',
          600: '#4f5779',
          700: '#363d5c',
          800: '#232842',
          900: '#161a2e',
          950: '#0c0f1e'
        },
        // Color de acento del curso, consistente en toda la app
        en: { DEFAULT: '#6366f1', soft: '#e0e7ff', dark: '#4338ca' }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
}
