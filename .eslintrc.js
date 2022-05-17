module.exports = {
  root: true,
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['tsconfig.json', 'tsconfig.lint.json', 'tsconfig.spec.json'],
  },
  overrides: [
    {
      files: '**/*.test.js',
      env: {
        jest: true,
      },
    },
  ],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 100,
        endOfLine: 'auto',
        tabWidth: 2,
        useTabs: false,
      },
    ],
  },
};
