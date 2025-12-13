/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5', // Indigo
        secondary: '#10B981', // Emerald
        accent: '#F59E0B', // Amber
        background: '#F3F4F6', // Gray-100
        surface: '#FFFFFF',
        text: '#1F2937', // Gray-800
        muted: '#6B7280', // Gray-500
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
