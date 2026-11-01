import { writeFile, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// Only compiled static assets are deployed. Source, .env and backups stay private.
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
await inspect(fileURLToPath(output));
// GitHub Pages must serve compiled assets without Jekyll processing.
await writeFile(new URL(".nojekyll", output), "");
console.log("Static build checked: no cloud endpoint, token, source map or backup files.");
