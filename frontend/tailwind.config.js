/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
/* THEME START */
      colors: {
        // Theme mapped colors
        bg: 'var(--bg)',
        side: 'var(--side)',
        card: 'var(--card)',
        line: 'var(--line)',
        input: 'var(--input)',
        hover: 'var(--hover)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        'on-accent': 'var(--on-accent)',
        gold: 'var(--gold)',
        danger: 'var(--danger)',
        like: 'var(--like)',
        brand: {
          50: 'var(--accent-2)',
          100: 'var(--accent-2)',
          200: 'var(--accent-2)',
          300: 'var(--accent-2)',
          400: 'var(--accent-2)',
          500: 'var(--accent)',
          600: 'var(--accent)',
          700: 'var(--accent)',
          800: 'var(--accent)',
          900: 'var(--accent)',
        },
        darkbg: 'var(--bg)',
        darkcard: 'var(--card)',
        darkborder: 'var(--line)',
      }
      /* THEME END */
    },
  },
  darkMode: 'class', // support manual dark mode if needed
  plugins: [],
}
