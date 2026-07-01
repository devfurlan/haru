/** @type {import('tailwindcss').Config} */
// Tema alinhado à paleta "Demandaê" do web (apps/web/src/app/globals.css).
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream: '#faf5ea',
        'cream-muted': '#f2eadb',
        paper: '#fffdf8',
        ink: '#0f1f18',
        'ink-soft': '#27392f',
        muted: '#51635a',
        green: '#0e7a45',
        'green-bright': '#2fd37a',
        'green-deep': '#0a3324',
        coral: '#ff5a36',
        'coral-soft': '#ff7b5c',
        destructive: '#e5484d',
      },
    },
  },
  plugins: [],
};
