#!/usr/bin/env node

/**
 * Simple static file server with custom headers support
 * Serves the 'out' directory with integrity hash header for config files
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const STATIC_DIR = path.join(__dirname, 'out');
const CONFIG_HASH = process.env.CONFIG_HASH || '';

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

const server = http.createServer((req, res) => {
  // Strip query parameters from URL
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(STATIC_DIR, urlPath === '/' ? 'index.html' : urlPath);

  // Security: prevent directory traversal
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(STATIC_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Check if file exists and is a file (not directory)
  fs.stat(filePath, (err, stats) => {
    if (err || stats.isDirectory()) {
      // If not found or is a directory, try different approaches
      if (!path.extname(filePath)) {
        // Try appending .html first
        filePath = filePath + '.html';
      }
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT' || err.code === 'EISDIR') {
          // Try index.html for client-side routing
          fs.readFile(path.join(STATIC_DIR, 'index.html'), (err, content) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('404 Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(content, 'utf-8');
            }
          });
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Internal Server Error: ' + err.code);
        }
      } else {
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const headers = { 'Content-Type': contentType };

        // Add integrity hash header for config files
        if (urlPath === '/config/custom-chains.json' && CONFIG_HASH) {
          headers['X-Config-Hash'] = CONFIG_HASH;
          headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        }

        res.writeHead(200, headers);
        res.end(content, 'utf-8');
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Serving static files from: ${STATIC_DIR}`);
  if (CONFIG_HASH) {
    console.log(`Config integrity hash: ${CONFIG_HASH}`);
  }
});
