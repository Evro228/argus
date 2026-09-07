// ARGUS // Tactical Cockpit Tailwind Configuration - Quantum Obsidian
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#05070a',
          900: '#08090b',
          850: '#0b0f17',
          800: '#101622',
          700: '#1a2234'
        },
        titanium: {
          border: 'rgba(255, 255, 255, 0.08)',
          medium: 'rgba(255, 255, 255, 0.14)',
          active: 'rgba(255, 255, 255, 0.28)',
          glow: 'rgba(255, 255, 255, 0.04)',
          muted: '#8e9aa8',
          text: '#f8fafc'
        },
        argus: {
          50: '#f0f9ff',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          900: '#0c4a6e',
          950: '#082f49'
        }
      }
    }
  }
};
