import { writeFile, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
// Cloudflare Pages serves only this directory. Never copy source, .env, or backups.
const output = new URL("../pages-dist/", import.meta.url);
async function inspect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await inspect(path);
    else {
      if (/^\.env|\.map$|backup.*\.json$/i.test(entry.name))
        throw new Error(`Unexpected deployment file: ${entry.name}`);
      const text = await readFile(path, "utf8");
      if (/supabase\.co|lovable\.cloud|sb_publishable_|sb_secret_|eyJhbGci/.test(text))
        throw new Error(`Cloud credentials or endpoint found: ${entry.name}`);
    }
  }
}
await inspect(output.pathname);
await writeFile(new URL("_redirects", output), "/* /index.html 200\n");
await writeFile(
  new URL("_headers", output),
  `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex, nofollow
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`,
);
console.log("Static Pages build checked: no cloud endpoint, token, source map or backup files.");
