/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fleet: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e', // Moving green
          600: '#16a34a',
          700: '#15803d',
        },
        status: {
          moving: '#10b981', // Emerald green
          arrived: '#3b82f6', // Blue
          idle: '#f59e0b', // Amber
          offline: '#6b7280', // Grey
          alert: '#ef4444', // Red
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
