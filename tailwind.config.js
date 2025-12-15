/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Couleurs personnalisables pour le thème
        theme: {
          violet: {
            DEFAULT: 'hsl(262, 83%, 58%)',
            light: 'hsl(262, 83%, 68%)',
            dark: 'hsl(262, 83%, 48%)',
          },
          orange: {
            DEFAULT: 'hsl(25, 95%, 53%)',
            light: 'hsl(25, 95%, 63%)',
            dark: 'hsl(25, 95%, 43%)',
          },
          green: {
            DEFAULT: 'hsl(142, 76%, 36%)',
            light: 'hsl(142, 76%, 46%)',
            dark: 'hsl(142, 76%, 26%)',
          },
          blue: {
            DEFAULT: 'hsl(217, 91%, 60%)',
            light: 'hsl(217, 91%, 70%)',
            dark: 'hsl(217, 91%, 50%)',
          },
          red: {
            DEFAULT: 'hsl(0, 84%, 60%)',
            light: 'hsl(0, 84%, 70%)',
            dark: 'hsl(0, 84%, 50%)',
          },
          pink: {
            DEFAULT: 'hsl(330, 81%, 60%)',
            light: 'hsl(330, 81%, 70%)',
            dark: 'hsl(330, 81%, 50%)',
          },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

