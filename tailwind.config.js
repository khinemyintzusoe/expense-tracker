/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#39ff7a',
          dim:     '#23c75c',
          soft:    'rgba(57, 255, 122, 0.12)',
        },
        page:  '#141414',
        ink: {
          DEFAULT: '#f4f4f5',
          dim:     '#a1a1aa',
          faint:   '#71717a',
        }
      }
    },
  },
  plugins: [],
}
