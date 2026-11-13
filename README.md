# Armenian Driving Theory — study app

An unofficial study tool for the Armenian driving-licence theory exam.
v1 covers **Group 1 (ABC categories)**: 147 questions, in English.

Questions: [Road Police of the Republic of Armenia](https://roadpolice.am).
Question text, options and answers are copied from the official PDF unchanged.

Static site: Vite + React + TypeScript + Tailwind. No backend, no login.
Progress is kept in the browser's localStorage.

## Run it

Requires [Node.js](https://nodejs.org) (LTS).

```bash
npm install
npm run dev
```

Open the address Vite prints (usually http://localhost:5173).

```bash
npm run build     # type-checks, then writes the static site to dist/
npm run preview   # serves dist/ locally to check the build
```

## Deploy (free)

`npm run build` produces `dist/`, a plain static folder. It uses relative paths
and hash routes (`#/practice/1`), so it works from any URL without server rules.

**Netlify**
- Drag-and-drop: run `npm run build`, then drop the `dist` folder on
  https://app.netlify.com/drop.
- Or connect the Git repository. `netlify.toml` already sets the build command
  (`npm run build`) and publish folder (`dist`).

**GitHub Pages**
1. Push the project to a GitHub repository (default branch `main`).
2. In the repository: Settings → Pages → Source: **GitHub Actions**.
3. `.github/workflows/deploy.yml` builds and publishes on every push to `main`.

The `data/` folder (JSON + images) must be committed: the build copies it into
the site. The raw PDF in `data/raw/` and `data/review.html` are not published.

## Project layout

```
data/
  raw/group-1-en.pdf      source PDF
  group-1-en.json         extracted questions
  images/g1/q001.webp     extracted pictures
  review.html             every question + picture + answer, for checking
scripts/
  extract.py              PDF -> JSON + images + review.html (with validation)
  sync-data.mjs           copies data/*.json + data/images to public/data/
src/
  config.ts               list of groups (one line per group)
  i18n/en.ts              all UI strings
  lib/                    storage, progress, settings, data loading, routing
  components/             Home, Practice, Mistakes, Runner, ImageViewer
```

`npm run dev` and `npm run build` run `sync-data` automatically, so the app
always serves what is in `data/`.

## Re-run the extraction

Requires Python 3.10+.

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r scripts/requirements.txt
.venv\Scripts\python scripts/extract.py
```

(On macOS/Linux use `.venv/bin/python`.)

The script reads `data/raw/group-1-en.pdf` and rewrites `data/group-1-en.json`,
`data/images/g1/` and `data/review.html`. It stops with an error and writes
nothing if validation fails:

- exactly the expected number of questions, numbered 1..N with no gaps;
- every question has text, 2–5 non-empty options numbered in order;
- every answer is within its options range;
- the `Answer: N` line agrees with the option printed in bold in the PDF.

It also lists every question whose picture mapping is uncertain. After a run,
open `data/review.html` and compare it with the PDF.

## Add a new group

1. Put the PDF at `data/raw/group-2-en.pdf`.
2. Extract it (set the real question count):

   ```bash
   .venv\Scripts\python scripts/extract.py --group 2 --expected 150
   ```

   This writes `data/group-2-en.json`, `data/images/g2/` and
   `data/review-g2.html`. Check the review page against the PDF.
3. Add one line to `src/config.ts`:

   ```ts
   { id: 2, file: 'group-2-en.json', categories: 'ABC' },
   ```

The home screen, practice, mistakes and progress tracking pick it up from there.
The extractor assumes the same PDF layout as Group 1; if a PDF is laid out
differently, validation fails rather than producing wrong data.

## How progress works

- **Practice**: the first tap on an answer counts as one attempt and the
  question locks. A question you already answered opens locked on your last
  answer; "Try again" unlocks it for a new attempt. "Show answer" reveals the
  answer without recording anything.
- **Statistics**: every attempt is counted per question (`correctCount`,
  `wrongCount`, `lastResult`, `lastAnsweredAt`) and shown under the question
  counter. The question grid is coloured by the last attempt.
- **My mistakes**: a wrong answer puts a question on the list; it leaves after
  2 correct answers in a row (`MISTAKE_CLEAR_STREAK` in `src/config.ts`). The
  list is refreshed at the start of each round.
- **Reset progress** clears a group's answers and statistics on this device.
- Progress saved by the first version is upgraded automatically on load.
- If localStorage is unavailable, the app still works; progress then lasts only
  until the page is closed.

## Built to grow (not built yet)

- **Languages**: content fields are keyed by language (`{"en": "..."}`), and UI
  strings live in `src/i18n/`. To add Russian or Armenian, add `ru.ts` / `hy.ts`
  with the same keys, register it in `src/i18n/index.ts`, add the `ru` / `hy`
  keys to the question JSON, and add a language switch.
- **Explanations**: when a question's `explanation` is not `null`, it is shown
  under the answer once the question is answered or revealed.
- **Exam simulation** (timed test): not implemented.
