#!/usr/bin/env node
// Post-build: inline all CSS and JS assets into a single self-contained HTML file.
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, 'dist');

let html = readFileSync(join(dist, 'index.html'), 'utf8');

// Inline <link rel="stylesheet" href="...">
html = html.replace(
  /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
  (_, href) => {
    const css = readFileSync(join(dist, href.replace(/^\.\//, '')), 'utf8');
    return `<style>${css}</style>`;
  }
);

// Inline <script ... src="..."></script>
html = html.replace(
  /<script([^>]*?)src="([^"]+)"([^>]*)><\/script>/g,
  (_, pre, src, post) => {
    const js = readFileSync(join(dist, src.replace(/^\.\//, '')), 'utf8');
    const attrs = (pre + post).replace(/type="module"/g, '').replace(/crossorigin/g, '').trim();
    return `<script${attrs ? ' ' + attrs : ''}>${js}</script>`;
  }
);

const out = join(dist, 'dashboard.html');
writeFileSync(out, html);
console.log(`Standalone: dist/dashboard.html (${(html.length / 1024).toFixed(0)} KB)`);
