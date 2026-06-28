/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#0f172a',
        'sidebar-hover': '#1e293b',
        primary: '#6366f1',
        'primary-dark': '#4f46e5',
        surface: '#1e293b',
        'surface-light': '#334155',
      },
    },
  },
  plugins: [],
}

