// ESM loader to inject mock modules for testbed mode
// Usage: node --import ./src/testbed/loader.js src/server/index.js

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register custom module resolution
register('data:text/javascript,' + encodeURIComponent(`
  import { readFile } from 'node:fs/promises';
  import { fileURLToPath } from 'node:url';

  export async function resolve(specifier, context, nextResolve) {
    // Skip aliasing if we're resolving from inside the wrapper itself
    const parentURL = context.parentURL || '';
    const isFromWrapper = parentURL.includes('express-wrapper.js');

    const mockMappings = {
      '@devvit/web/server': '${pathToFileURL(path.resolve(__dirname, 'mocks/devvit-web-server.js')).href}',
      '@devvit/media': '${pathToFileURL(path.resolve(__dirname, 'mocks/devvit-media.js')).href}',
      '@devvit/web/client': '${pathToFileURL(path.resolve(__dirname, 'mocks/devvit-web-client.js')).href}',
      'express': isFromWrapper ? null : '${pathToFileURL(path.resolve(__dirname, 'mocks/express-wrapper.js')).href}'
    };

    if (mockMappings[specifier]) {
      return {
        url: mockMappings[specifier],
        shortCircuit: true
      };
    }

    // Handle Vite ?raw imports - strip the ?raw and mark for text loading
    if (specifier.endsWith('?raw')) {
      const cleanSpecifier = specifier.replace('?raw', '');
      const resolved = await nextResolve(cleanSpecifier, context);
      return {
        url: resolved.url + '?raw',
        shortCircuit: true
      };
    }

    return nextResolve(specifier, context);
  }

  export async function load(url, context, nextLoad) {
    // Handle ?raw imports - return file contents as text export
    if (url.includes('?raw')) {
      const cleanUrl = url.replace('?raw', '');
      const filePath = fileURLToPath(cleanUrl);
      const content = await readFile(filePath, 'utf-8');

      return {
        format: 'module',
        source: 'export default ' + JSON.stringify(content),
        shortCircuit: true
      };
    }

    return nextLoad(url, context);
  }
`), import.meta.url);

console.log('[TESTBED] Mock loader registered');
