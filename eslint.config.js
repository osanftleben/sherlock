import js from '@eslint/js';
import globals from 'globals';

// Prüft vor allem, was beim Umbauen leicht passiert: fehlende oder überflüssige Importe,
// Tippfehler in Namen, unerreichbarer Code.
export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
    },
  },
  {
    files: ['eslint.config.js', 'vite.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
