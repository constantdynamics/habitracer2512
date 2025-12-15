/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vaporwave color palette
        vapor: {
          dark: '#4A1942',
          darker: '#3A1432',
          darkest: '#2A0A22',
          purple: '#8B5CF6',
          pink: '#FF00FF',
          magenta: '#FF1493',
          cyan: '#00FFFF',
          gold: '#FFD700',
          neon: {
            pink: '#FF6B9D',
            blue: '#00D4FF',
            purple: '#B026FF',
          }
        }
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-pink': '0 0 5px #FF00FF, 0 0 20px #FF00FF, 0 0 40px #FF00FF',
        'neon-cyan': '0 0 5px #00FFFF, 0 0 20px #00FFFF, 0 0 40px #00FFFF',
        'neon-gold': '0 0 5px #FFD700, 0 0 20px #FFD700, 0 0 40px #FFD700',
        'glow': '0 0 15px rgba(255, 0, 255, 0.5)',
        'glow-cyan': '0 0 15px rgba(0, 255, 255, 0.5)',
      },
      backgroundImage: {
        'vapor-gradient': 'linear-gradient(180deg, #4A1942 0%, #3A1432 50%, #2A0A22 100%)',
        'grid-pattern': 'linear-gradient(rgba(255, 0, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 0, 255, 0.1) 1px, transparent 1px)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px #FF00FF, 0 0 10px #FF00FF' },
          '50%': { boxShadow: '0 0 20px #FF00FF, 0 0 40px #FF00FF' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
