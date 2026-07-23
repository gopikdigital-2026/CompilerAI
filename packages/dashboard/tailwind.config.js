/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f4ff', 100: '#b3daff', 200: '#80c0ff', 300: '#4da6ff',
          400: '#1a8cff', 500: '#0072e6', 600: '#0059b3', 700: '#004080',
          800: '#00274d', 900: '#000e1a',
        },
        accent: {
          50: '#e6fff9', 100: '#b3ffee', 200: '#80ffe3', 300: '#4dffd8',
          400: '#1affcd', 500: '#00e6b4', 600: '#00b38c', 700: '#008064',
          800: '#004d3b', 900: '#001a14',
        },
        surface: {
          950: '#080b12', 900: '#0d1117', 850: '#111720', 800: '#161c28',
          750: '#1a2030', 700: '#1e2538', 600: '#252d42', 500: '#2d3650',
        },
        neutral: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a',
        },
        success: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a' },
        warning: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04' },
        error:   { 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
        'brand-gradient': 'linear-gradient(135deg, #0072e6 0%, #00e6b4 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, #0d1117 0%, #080b12 100%)',
        'sidebar-gradient-light': 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      },
      backgroundSize: { 'grid': '40px 40px' },
      boxShadow: {
        'glow-brand': '0 0 20px rgba(0,114,230,0.3)',
        'glow-accent': '0 0 20px rgba(0,230,180,0.3)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
