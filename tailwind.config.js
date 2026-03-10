/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:             'rgb(var(--color-bg-rgb) / <alpha-value>)',
          surface:        'rgb(var(--color-surface-rgb) / <alpha-value>)',
          darkest:        'rgb(var(--color-darkest-rgb) / <alpha-value>)',
          purple:         'rgb(var(--color-purple-rgb) / <alpha-value>)',
          muted:          'rgb(var(--color-muted-rgb) / <alpha-value>)',
          'muted-surface':'rgb(var(--color-muted-surface-rgb) / <alpha-value>)',
          gold:           'rgb(var(--color-gold-rgb) / <alpha-value>)',
          rose:           'rgb(var(--color-rose-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'navy-sm':   '0 2px 8px rgb(var(--shadow-rgb) / 0.45)',
        'navy-md':   '0 4px 20px rgb(var(--shadow-rgb) / 0.6)',
        'navy-lg':   '0 8px 40px rgb(var(--shadow-rgb) / 0.75)',
        /* aliases kept for existing class usage */
        'purple-sm': '0 2px 8px rgb(var(--shadow-rgb) / 0.45)',
        'purple-md': '0 4px 20px rgb(var(--shadow-rgb) / 0.6)',
        'purple-lg': '0 8px 40px rgb(var(--shadow-rgb) / 0.75)',
      },
      backgroundImage: {
        'brand-radial': 'var(--gradient-radial)',
      },
    },
  },
  plugins: [],
}
