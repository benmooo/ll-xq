import { defineConfig, loadEnv, rspack } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSolid } from '@rsbuild/plugin-solid';

export default defineConfig({
  plugins: [
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
    }),
    pluginSolid(),
  ],

  tools: {
    rspack: {
      plugins: [
        new rspack.DefinePlugin({
          // 'process.env.DEBUG': JSON.stringify(process.env.DEBUG || false),
          'import.meta.env.LLXQ_SERVER_URL': JSON.stringify(
            process.env.LLXQ_SERVER_URL || 'localhost:3000',
          ),
        }),
      ],
    },
  },
});
