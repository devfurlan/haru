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
        muted: '#4a5a50', // corpo/subhead do design (era #51635a)
        green: '#0e7a45',
        'green-bright': '#2fd37a',
        'green-deep': '#0a3324',
        coral: '#ff5a36',
        'coral-soft': '#ff7b5c',
        destructive: '#e5484d',
        // Tokens do design mobile: texto suave, bordas e chips.
        sub: '#7c8a80', // texto secundário do design (mais claro que `muted`)
        line: '#f0e8d4', // hairline de cards sobre creme
        edge: '#e2d9c4', // borda de inputs/chips
        chip: '#eaf6ee', // fundo de chip verde-claro (ratings, "aberto")
        'green-card': '#083020', // card escuro do "próximo agendamento"
      },
    },
  },
  plugins: [],
};
