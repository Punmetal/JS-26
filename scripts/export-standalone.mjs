import fs from 'node:fs/promises';
import path from 'node:path';

// A portable, offline prototype. No uploaded PDFs or contact details are bundled.
const root = process.cwd();
const dist = path.join(root, 'dist');
let html = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const jsPath = html.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/)?.[1];
const cssPath = html.match(/<link[^>]*href="([^"]+\.css)"[^>]*>/)?.[1];
if (!jsPath || !cssPath) throw new Error('Build output is missing the script or stylesheet. Run npm run build first.');
let css = await fs.readFile(path.join(dist, cssPath), 'utf8');
const localUrls = [...new Set([...css.matchAll(/url\(([^)]+)\)/g)].map(match => match[1].replace(/["']/g, '')).filter(url => !url.startsWith('data:')))];
for (const url of localUrls) {
  const buffer = await fs.readFile(path.join(dist, url));
  const type = url.endsWith('.woff2') ? 'font/woff2' : 'font/woff';
  css = css.split(url).join(`data:${type};base64,${buffer.toString('base64')}`);
}
const assets = {};
for (const file of await fs.readdir(path.join(dist, 'portfolio'))) {
  if (file.endsWith('.webp')) assets[path.basename(file, '.webp')] = `data:image/webp;base64,${(await fs.readFile(path.join(dist, 'portfolio', file))).toString('base64')}`;
}
const js = (await fs.readFile(path.join(dist, jsPath), 'utf8')).replaceAll('</script', '<\\/script');
const favicon = await fs.readFile(path.join(dist, 'favicon.svg'));
html = html.replace(/<link[^>]*rel="icon"[^>]*>/, () => `<link rel="icon" href="data:image/svg+xml;base64,${favicon.toString('base64')}" />`);
html = html.replace(/<link[^>]*href="[^"]+\.css"[^>]*>/, () => `<style>${css}</style>`);
html = html.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/, '');
// Callback replacements preserve literal $&, $', and $` in minified bundles.
html = html.replace('</body>', () => `<script>globalThis.__NEXTROLE_ASSETS__ = ${JSON.stringify(assets)};</script><script type="module">${js}</script></body>`);
await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
const target = path.join(root, 'artifacts', 'jobu-prototype.html');
await fs.writeFile(target, html);
// Preserve the earlier shared artifact path as a compatibility copy.
await fs.writeFile(path.join(root, 'artifacts', 'nextrole-prototype.html'), html);
console.log(`Portable prototype: artifacts/jobu-prototype.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
