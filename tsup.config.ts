import { defineConfig } from 'tsup';

export default defineConfig([{
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: 'node20',
  platform: 'node',
}, {
  entry: {
    'cli/index': 'cli/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: false,
  splitting: false,
  target: 'node20',
  platform: 'node',
}]);
