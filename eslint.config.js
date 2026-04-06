//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    files: ['src/routes/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '#/integrations/trpc/client',
              message:
                'Do not import trpcClient in UI files. Use hooks/service layer instead.',
            },
            {
              name: '#/integrations/tanstack-query/root-provider',
              importNames: ['trpcClient'],
              message:
                'Do not import trpcClient in UI files. Use useTRPC() in hooks/components.',
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    ignores: ['eslint.config.js', 'prettier.config.js'],
  },
]
