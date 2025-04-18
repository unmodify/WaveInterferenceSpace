import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'scripts-list',
      configureServer(server) {
        server.middlewares.use('/scripts-list', (req, res, next) => {
          const scriptsDir = path.join(process.cwd(), 'scripts');
          fs.readdir(scriptsDir, (err, files) => {
            if (err) {
              res.statusCode = 500;
              res.end('Error reading scripts directory');
            } else {
              const jsFiles = files.filter(file => file.endsWith('.js'));
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(jsFiles));
            }
          });
        });
      }
    }
  ]
});