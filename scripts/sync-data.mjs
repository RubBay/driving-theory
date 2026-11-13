// Copies the question data the app needs (data/group-*.json and data/images/)
// into public/data/ so Vite serves it in dev and ships it in the build.
// Runs automatically before `npm run dev` and `npm run build`.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'data')
const dest = join(root, 'public', 'data')

if (!existsSync(src)) {
  console.error('sync-data: data/ folder not found. Run the extraction first (see README).')
  process.exit(1)
}
rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })

const jsonFiles = readdirSync(src).filter((f) => /^group-\d+-[a-z]+\.json$/.test(f))
for (const f of jsonFiles) cpSync(join(src, f), join(dest, f))
if (existsSync(join(src, 'images'))) {
  cpSync(join(src, 'images'), join(dest, 'images'), { recursive: true })
}
console.log(`sync-data: copied ${jsonFiles.length} question file(s) and images to public/data/`)
