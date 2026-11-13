# Armenian Driving Theory — study app

An unofficial study tool for the Armenian driving-licence theory exam.
Covers **Group 1 (ABC categories)**: 147 questions, in English and Russian.

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

### Other languages

The Russian edition of Group 1 is `data/raw/group-1-ru.pdf`. Extract it after
the English one:

```bash
.venv\Scripts\python -X utf8 scripts/extract.py --lang ru --share-images-with en
```

This writes `data/group-1-ru.json` and `data/review-ru.html`. With
`--share-images-with en` the script also checks that question numbers, answers,
option counts and which questions have a picture are identical to the English
file, and reuses the English pictures when they are the same (any picture that
differs is saved to `data/images/g1-ru/` and listed as uncertain). A new
language needs its "Answer" and "page" words added to `LABELS` in the script.

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
   { id: 2, files: { en: 'group-2-en.json' }, categories: 'ABC' },
   ```

The home screen, practice, mistakes and progress tracking pick it up from there.
The extractor assumes the same PDF layout as Group 1; if a PDF is laid out
differently, validation fails rather than producing wrong data.

## How progress works

- **Practice**: you start by choosing "Question by question" (1 to N in order)
  or "Shuffle". The order is fixed for the whole practice and saved, so you can
  close the app and continue later; "New practice" starts over.
  - Each question is answered once per practice, decided by your first pick:
    several wrong picks (or wrong, then right) count as a single mistake. Wrong
    picks turn red and stay red; the other options stay open, without giving
    the correct one away. The correct answer is marked when you pick it, press
    "Show answer" (which records nothing), or have picked every wrong option.
  - When every question has been answered, a summary shows how many were right
    and wrong and the time spent. Time counts only while the practice screen is
    visible and in use (it pauses after 5 minutes without a tap or key press).
- **Highlighted questions**: the highlighter button next to the question
  number saves a question (a yellow dot marks it in the question grid). On the
  home screen, "Highlighted" lists them all; open one to see it with a grid of
  only the highlighted questions on the right. Highlights are kept when you
  reset progress.
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

## Languages

English and Russian. The EN / RU switch in the top-right corner changes the
interface and the questions at once; the choice is saved. On a first visit the
app picks Russian if the browser prefers it, otherwise English. Progress,
statistics, highlights and a practice in progress are shared between languages.

- UI strings live in `src/i18n/en.ts` and `src/i18n/ru.ts` (same keys).
  `{n|form|forms}` picks a plural form, e.g. `{count|вопрос|вопроса|вопросов}`.
- Each group lists one question file per language in `src/config.ts`. The app
  loads them all and merges them by question id; the English file supplies the
  answers and pictures.
- To add Armenian: extract `group-1-hy.json` (add its words to `LABELS` in
  `scripts/extract.py`), add `hy.ts`, register it in `src/i18n/index.ts`
  (`dictionaries` and `LANG_NAMES`), and add `hy: 'group-1-hy.json'` to the group.

## Built to grow (not built yet)

- **Explanations**: when a question's `explanation` is not `null`, it is shown
  under the answer once the question is answered or revealed.
- **Exam simulation** (timed test): not implemented.
