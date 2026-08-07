/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './constants/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
    './store/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F766E',
          dark: '#115E59',
          light: '#14B8A6',
        },
        accent: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        error: '#DC2626',
        status: {
          pending: '#F59E0B',
          underReview: '#3B82F6',
          inProgress: '#6366F1',
          resolved: '#16A34A',
          rejected: '#DC2626',
        },
      },
    },
  },
  plugins: [],
}
