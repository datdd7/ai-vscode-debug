#!/usr/bin/env node
// Post-build: inline all CSS and JS assets into a single self-contained HTML file.
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, 'dist');

// Resolve any asset href (./assets/x, /base/assets/x, assets/x) → absolute path in dist
function resolveAsset(href) {
  // Extract the assets/filename part regardless of base prefix
  const match = href.match(/assets\/[^?#]+/);
  if (match) return join(dist, match[0]);
  // Fallback: strip leading slashes/dots and join with dist
  return join(dist, href.replace(/^[./]+/, ''));
}

let html = readFileSync(join(dist, 'index.html'), 'utf8');

// Inline <link rel="stylesheet" ...>
html = html.replace(
  /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*\/?>/g,
  (_, href) => {
    try {
      const css = readFileSync(resolveAsset(href), 'utf8');
      return `<style>${css}</style>`;
    } catch { return ''; }
  }
);

// Inline <script ... src="..."></script>
html = html.replace(
  /<script([^>]*?)src="([^"]+)"([^>]*)><\/script>/g,
  (_, pre, src, post) => {
    try {
      const js = readFileSync(resolveAsset(src), 'utf8');
      const attrs = (pre + post).replace(/type="module"/g, '').replace(/crossorigin/g, '').trim();
      return `<script${attrs ? ' ' + attrs : ''}>${js}</script>`;
    } catch { return ''; }
  }
);

const out = join(dist, 'dashboard.html');
writeFileSync(out, html);
console.log(`Standalone: dist/dashboard.html (${(html.length / 1024).toFixed(0)} KB)`);
