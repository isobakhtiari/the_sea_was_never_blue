import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // imports the React plugin

// function must export or return a configuration object
export default defineConfig({
  plugins: [react()],
  base: '/the_sea_was_never_blue/',
});