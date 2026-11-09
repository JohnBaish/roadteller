import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { SOURCES, writePageData } from './scripts/pageData.ts';

// The page's data files (scripts/pageData.ts), made from data/ before every build and dev start, into public/data.
function roadtellerData(): Plugin {
  return {
    name: 'roadteller-data',
    buildStart() {
      for (const f of SOURCES) this.addWatchFile(f);
      const ix = writePageData(process.cwd());
      console.log(`page data: ${ix.councils.length} council areas, ${ix.squares.length} squares`);
    },
  };
}

export default defineConfig({
  plugins: [react(), roadtellerData()],
  build: { outDir: 'dist' },
});
