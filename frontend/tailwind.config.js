const color = token => `rgb(var(--${token}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
          .map(shade => [shade, color(`brand-${shade}`)])),
        background: color('canvas'),
        surface: color('surface'),
        border: color('line'),
        text: { DEFAULT: color('ink'), secondary: color('muted') },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['Georgia', 'serif'] },
    },
  },
  plugins: [],
};
