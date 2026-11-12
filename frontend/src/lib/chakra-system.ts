import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    tokens: {
      fonts: {},
    },
  },
});

export const system = createSystem(defaultConfig, config);
