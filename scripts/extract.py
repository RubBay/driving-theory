"""Extract a question-bank PDF into JSON + WebP images + an HTML review page.

Usage:
    python scripts/extract.py                      # Group 1, English (defaults)
    python scripts/extract.py --group 2 --expected 150 --pdf data/raw/group-2-en.pdf
    python scripts/extract.py --lang ru --share-images-with en   # Russian edition of group 1

Outputs (relative to the project root):
    data/group-<N>-<lang>.json
    data/images/g<N>/qNNN.webp
    data/review-g<N>.html  (data/review.html for group 1)

The text is copied from the PDF verbatim. The only normalisation is joining
soft-wrapped lines of one paragraph with a single space.

The script exits with a non-zero status if validation fails.
"""

from __future__ import annotations

import argparse
import html
import io
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

# --- Layout constants (PDF points), measured from the source PDF -------------
HEADER_MAX_Y = 35      # running header on pages 2+ sits above this
FOOTER_MIN_Y = 800     # "page N / M" footer sits below this
QNUM_MAX_X = 60        # question numbers start at x ~43
BODY_MIN_X = 65        # question text / option markers start at x ~70
OPT_TEXT_MIN_X = 85    # option text starts at x ~90
QUESTION_FONT_MIN = 10.3   # question text is 10.5 pt, options are 10.0 pt
MAX_IMAGE_WIDTH = 1000
WEBP_QUALITY = 80

RE_QNUM = re.compile(r"^(\d{1,3})\.\s*(.*)$")
RE_OPT = re.compile(r"^([1-9])\.\s*(.*)$")
# Words that differ between the language editions of the PDF.
LABELS = {
    "en": {"answer": "Answer", "page": "page"},
    "ru": {"answer": "Ответ", "page": "стр."},
}
RE_ANSWER = re.compile(r"^Answer:\s*(\d+)\s*$")
RE_FOOTER = re.compile(r"^page \d+ / \d+$")


def set_language(lang: str) -> None:
    global RE_ANSWER, RE_FOOTER
    if lang not in LABELS:
        raise SystemExit(f"ERROR: unknown language {lang!r}; add its labels to LABELS")
    words = LABELS[lang]
    RE_ANSWER = re.compile(rf"^{re.escape(words['answer'])}:\s*(\d+)\s*$")
    RE_FOOTER = re.compile(rf"^{re.escape(words['page'])} \d+ / \d+$")


@dataclass
class Line:
    page: int          # 1-based
    x0: float
    y0: float
    y1: float
    size: float
    bold: bool         # Semibold or Bold
    text: str


@dataclass
class Img:
    page: int
    y0: float
    y1: float
    xref: int
    bbox: tuple


@dataclass
class Question:
    number: int
    page: int
    q_lines: list[str] = field(default_factory=list)
    options: list[list[str]] = field(default_factory=list)
    option_markers: list[int] = field(default_factory=list)
    bold_options: list[int] = field(default_factory=list)   # markers printed in bold
    answer: int | None = None
    images: list[Img] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)          # image-mapping doubts
    saw_option: bool = False
    closed: bool = False                                    # "Answer:" line seen

    @property
    def text(self) -> str:
        return " ".join(s.strip() for s in self.q_lines if s.strip())

    @property
    def option_texts(self) -> list[str]:
        return [" ".join(s.strip() for s in parts if s.strip()) for parts in self.options]


def read_items(doc: pymupdf.Document) -> list[Line | Img]:
    """All text lines and images of the document in reading order."""
    items: list[tuple[tuple, Line | Img]] = []
    for pno, page in enumerate(doc, start=1):
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for ln in block["lines"]:
                spans = [s for s in ln["spans"] if s["text"].strip()]
                if not spans:
                    continue
                text = "".join(s["text"] for s in ln["spans"]).strip()
                x0, y0, _, y1 = ln["bbox"]
                if pno > 1 and y1 < HEADER_MAX_Y:
                    continue
                if y0 > FOOTER_MIN_Y and RE_FOOTER.match(text):
                    continue
                first = spans[0]
                bold = "Bold" in first["font"] or bool(first["flags"] & 16)
                items.append(((pno, round(y0), x0), Line(pno, x0, y0, y1, first["size"], bold, text)))
        for info in page.get_image_info(xrefs=True):
            x0, y0, x1, y1 = info["bbox"]
            items.append(((pno, round(y0), x0), Img(pno, y0, y1, info["xref"], (x0, y0, x1, y1))))
    items.sort(key=lambda t: t[0])
    return [it for _, it in items]


def parse(items: list[Line | Img]) -> tuple[list[Question], list[str]]:
    questions: list[Question] = []
    problems: list[str] = []
    cur: Question | None = None

    for it in items:
        if isinstance(it, Img):
            if cur is None:
                problems.append(f"page {it.page}: image before the first question (xref {it.xref})")
                continue
            if cur.closed:
                cur.notes.append("image appears after the Answer line")
            elif cur.saw_option:
                cur.notes.append("image appears after the options started")
            cur.images.append(it)
            continue

        # A new question: bold number at the left margin.
        m = RE_QNUM.match(it.text)
        if m and it.x0 < QNUM_MAX_X and it.bold and it.size >= QUESTION_FONT_MIN:
            if cur is not None and not cur.closed:
                problems.append(f"question {cur.number}: no 'Answer:' line before question {m.group(1)}")
            cur = Question(number=int(m.group(1)), page=it.page)
            if m.group(2):
                cur.q_lines.append(m.group(2))
            questions.append(cur)
            continue

        if cur is None:
            continue  # document title block on page 1

        m = RE_ANSWER.match(it.text)
        if m:
            if cur.closed:
                problems.append(f"question {cur.number}: more than one 'Answer:' line")
            cur.answer = int(m.group(1))
            cur.closed = True
            continue

        if cur.closed:
            problems.append(f"page {it.page}: stray text after question {cur.number}: {it.text!r}")
            continue

        is_option_size = it.size < QUESTION_FONT_MIN
        m = RE_OPT.match(it.text)
        if is_option_size and m and BODY_MIN_X <= it.x0 < OPT_TEXT_MIN_X:
            # Option marker ("3.") - its text is usually a separate line at x ~90.
            cur.saw_option = True
            cur.option_markers.append(int(m.group(1)))
            cur.options.append([m.group(2)] if m.group(2) else [])
            if it.bold:
                cur.bold_options.append(int(m.group(1)))
            continue
        if is_option_size and it.x0 >= OPT_TEXT_MIN_X and cur.saw_option:
            cur.options[-1].append(it.text)
            continue
        if not cur.saw_option and it.x0 >= BODY_MIN_X:
            cur.q_lines.append(it.text)
            continue
        problems.append(f"page {it.page}: unclassified line in question {cur.number}: {it.text!r}")

    if cur is not None and not cur.closed:
        problems.append(f"question {cur.number}: no 'Answer:' line")
    return questions, problems


def validate(questions: list[Question], expected: int) -> list[str]:
    errs: list[str] = []
    numbers = [q.number for q in questions]
    if len(questions) != expected:
        errs.append(f"expected {expected} questions, found {len(questions)}")
    if numbers != list(range(1, len(numbers) + 1)):
        missing = sorted(set(range(1, expected + 1)) - set(numbers))
        dupes = sorted({n for n in numbers if numbers.count(n) > 1})
        errs.append(f"numbers are not 1..N in order (missing: {missing}, duplicated: {dupes})")
    for q in questions:
        opts = q.option_texts
        if not q.text:
            errs.append(f"question {q.number}: empty question text")
        if len(opts) < 2:
            errs.append(f"question {q.number}: only {len(opts)} option(s)")
        if len(opts) > 5:
            errs.append(f"question {q.number}: {len(opts)} options (max 5 expected)")
        if q.option_markers != list(range(1, len(opts) + 1)):
            errs.append(f"question {q.number}: option numbers are {q.option_markers}")
        for i, o in enumerate(opts, start=1):
            if not o:
                errs.append(f"question {q.number}: option {i} is empty")
        if q.answer is None:
            errs.append(f"question {q.number}: no answer")
        elif not 1 <= q.answer <= len(opts):
            errs.append(f"question {q.number}: answer {q.answer} outside 1..{len(opts)}")
        # Cross-check: the PDF also prints the correct option in bold.
        if q.answer is not None and q.bold_options != [q.answer]:
            errs.append(
                f"question {q.number}: 'Answer: {q.answer}' disagrees with the bold option(s) {q.bold_options}"
            )
    return errs


def image_uncertainties(questions: list[Question]) -> dict[int, list[str]]:
    """Questions whose picture mapping deserves a manual look."""
    out: dict[int, list[str]] = {}
    seen_xrefs: dict[int, int] = {}
    for q in questions:
        notes = list(q.notes)
        if len(q.images) > 1:
            notes.append(f"{len(q.images)} images found; only the first is used")
        for im in q.images:
            if im.page != q.page:
                notes.append(f"image is on page {im.page}, question starts on page {q.page}")
            if im.xref in seen_xrefs:
                notes.append(f"same image object is also used by question {seen_xrefs[im.xref]}")
            else:
                seen_xrefs[im.xref] = q.number
            w, h = im.bbox[2] - im.bbox[0], im.bbox[3] - im.bbox[1]
            if w < 60 or h < 40:
                notes.append(f"very small image ({w:.0f}x{h:.0f} pt)")
        if notes:
            out[q.number] = notes
    return out


def load_image(doc: pymupdf.Document, im: Img) -> Image.Image:
    pix = pymupdf.Pixmap(doc, im.xref)
    smask = doc.extract_image(im.xref).get("smask", 0)
    if smask:
        pix = pymupdf.Pixmap(pix, pymupdf.Pixmap(doc, smask))
    if pix.colorspace is None or pix.colorspace.n != 3:
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, "white")
        bg.paste(img, mask=img.split()[-1])
        img = bg
    else:
        img = img.convert("RGB")
    if img.width > MAX_IMAGE_WIDTH:
        img = img.resize(
            (MAX_IMAGE_WIDTH, round(img.height * MAX_IMAGE_WIDTH / img.width)), Image.LANCZOS
        )
    return img


def save_image(img: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=WEBP_QUALITY, method=6)


def picture_difference(a: Image.Image, b: Image.Image) -> float:
    """Mean pixel difference (0-255) of two pictures scaled to the same small size."""
    from PIL import ImageChops, ImageStat
    size = (200, 100)
    diff = ImageChops.difference(a.convert("RGB").resize(size), b.convert("RGB").resize(size))
    return sum(ImageStat.Stat(diff).mean) / 3


def write_review(path: Path, group: int, lang: str, records: list[dict], pages: dict[int, int],
                 uncertain: dict[int, list[str]], pdf_name: str) -> None:
    esc = html.escape
    parts = [
        f"<!doctype html><html lang='{esc(lang)}'><head><meta charset='utf-8'>",
        "<meta name='viewport' content='width=device-width, initial-scale=1'>",
        f"<title>Extraction review - Group {group}</title>",
        "<style>",
        "body{font:15px/1.45 system-ui,sans-serif;max-width:820px;margin:0 auto;padding:16px;"
        "background:#f6f7f9;color:#16181d}",
        "h1{font-size:22px;margin:8px 0}.meta{color:#555;margin-bottom:16px}",
        ".q{background:#fff;border:1px solid #d9dce3;border-radius:8px;padding:14px 16px;margin:0 0 14px}",
        ".q.warn{border-color:#c77700;border-width:2px}",
        ".head{display:flex;gap:10px;align-items:baseline;justify-content:space-between}",
        ".num{font-weight:700}.page{color:#666;font-size:13px;white-space:nowrap}",
        ".text{font-weight:600;margin:6px 0 10px}",
        "img{display:block;max-width:100%;height:auto;border:1px solid #d9dce3;margin:0 0 10px}",
        "ol{margin:0;padding-left:26px}li{padding:3px 6px;border-radius:4px;margin:2px 0}",
        "li.ok{background:#d6f5df;font-weight:600;outline:1px solid #2a8a4a}",
        ".ans{margin-top:8px;font-size:13px;color:#444}",
        ".note{background:#fff3d6;border-left:4px solid #c77700;padding:6px 10px;margin:8px 0;font-size:13px}",
        ".noimg{color:#777;font-size:13px;font-style:italic;margin:0 0 10px}",
        "</style></head><body>",
        f"<h1>Extraction review - Group {group} ({esc(lang)})</h1>",
        f"<div class='meta'>{len(records)} questions from <code>{esc(pdf_name)}</code> - "
        f"{sum(1 for r in records if r['image'])} with a picture - "
        f"{len(uncertain)} with an uncertain picture mapping. "
        "The correct option is highlighted in green.</div>",
    ]
    if uncertain:
        links = ", ".join(f"<a href='#q{n}'>{n}</a>" for n in sorted(uncertain))
        parts.append(f"<div class='note'>Uncertain picture mapping: {links}</div>")
    for r in records:
        n = r["number"]
        warn = " warn" if n in uncertain else ""
        parts.append(f"<section class='q{warn}' id='q{n}'>")
        parts.append(
            f"<div class='head'><span class='num'>{n}.</span>"
            f"<span class='page'>PDF page {pages[n]} - {esc(r['id'])}</span></div>"
        )
        parts.append(f"<div class='text'>{esc(r['question'][lang])}</div>")
        for note in uncertain.get(n, []):
            parts.append(f"<div class='note'>{esc(note)}</div>")
        if r["image"]:
            parts.append(
                f"<img loading='lazy' src='{esc(r['image'])}' alt='Illustration for question {n}'>"
            )
        else:
            parts.append("<div class='noimg'>(no picture)</div>")
        parts.append("<ol>")
        for i, o in enumerate(r["options"], start=1):
            cls = " class='ok'" if i == r["answer"] else ""
            parts.append(f"<li{cls}>{esc(o[lang])}</li>")
        parts.append("</ol>")
        parts.append(f"<div class='ans'>Answer: {r['answer']}</div></section>")
    parts.append("</body></html>")
    path.write_text("\n".join(parts), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--group", type=int, default=1)
    ap.add_argument("--lang", default="en")
    ap.add_argument("--pdf", type=Path, default=None, help="default: data/raw/group-<N>-<lang>.pdf")
    ap.add_argument("--expected", type=int, default=147, help="expected number of questions")
    ap.add_argument("--share-images-with", metavar="LANG", default=None,
                    help="reuse the pictures already extracted for another language of the same "
                         "group (e.g. en) when they are identical; check answers against it too")
    args = ap.parse_args()

    g, lang = args.group, args.lang
    set_language(lang)
    pdf_path = args.pdf or ROOT / "data" / "raw" / f"group-{g}-{lang}.pdf"
    if not pdf_path.is_file():
        print(f"ERROR: PDF not found: {pdf_path}", file=sys.stderr)
        return 2

    doc = pymupdf.open(pdf_path)
    questions, problems = parse(read_items(doc))
    errors = problems + validate(questions, args.expected)
    if errors:
        print(f"VALIDATION FAILED ({len(errors)} problem(s)) - nothing written:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    uncertain = image_uncertainties(questions)
    data_dir = ROOT / "data"

    # Another language of the same group: its pictures can be shared, and its answers
    # must match question for question.
    other: dict[int, dict] = {}
    if args.share_images_with:
        other_path = data_dir / f"group-{g}-{args.share_images_with}.json"
        if not other_path.is_file():
            print(f"ERROR: {other_path} not found; extract that language first", file=sys.stderr)
            return 2
        other = {r["number"]: r for r in json.loads(other_path.read_text(encoding="utf-8"))}
        cross_errors: list[str] = []
        if sorted(other) != [q.number for q in questions]:
            cross_errors.append(f"question numbers differ from {other_path.name}")
        for q in questions:
            o = other.get(q.number)
            if not o:
                continue
            if o["answer"] != q.answer:
                cross_errors.append(f"question {q.number}: answer {q.answer}, but {o['answer']} in {other_path.name}")
            if len(o["options"]) != len(q.option_texts):
                cross_errors.append(f"question {q.number}: {len(q.option_texts)} options, "
                                    f"but {len(o['options'])} in {other_path.name}")
            if bool(o["image"]) != bool(q.images):
                cross_errors.append(f"question {q.number}: picture {'present' if q.images else 'missing'}, "
                                    f"but {'present' if o['image'] else 'missing'} in {other_path.name}")
        if cross_errors:
            print(f"CROSS-CHECK FAILED against {other_path.name} ({len(cross_errors)}) - nothing written:",
                  file=sys.stderr)
            for e in cross_errors:
                print(f"  - {e}", file=sys.stderr)
            return 1

    own_rel_dir = f"images/g{g}" if not args.share_images_with else f"images/g{g}-{lang}"
    own_dir = data_dir / own_rel_dir
    if own_dir.is_dir():
        for old in own_dir.glob("q*.webp"):
            old.unlink()

    records: list[dict] = []
    total_bytes = 0
    shared = 0
    worst_diff = 0.0
    for q in questions:
        image = None
        if q.images:
            img = load_image(doc, q.images[0])
            o_img = other.get(q.number, {}).get("image")
            if o_img and (data_dir / o_img).is_file():
                diff = picture_difference(img, Image.open(data_dir / o_img))
                worst_diff = max(worst_diff, diff)
                if diff <= 6:
                    image = o_img
                    shared += 1
                else:
                    uncertain.setdefault(q.number, []).append(
                        f"picture differs from the {args.share_images_with} edition (diff {diff:.1f}); saved separately")
            if image is None:
                image = f"{own_rel_dir}/q{q.number:03d}.webp"
                save_image(img, data_dir / image)
                total_bytes += (data_dir / image).stat().st_size
        records.append({
            "id": f"g{g}-q{q.number:03d}",
            "group": g,
            "number": q.number,
            "question": {lang: q.text},
            "options": [{lang: o} for o in q.option_texts],
            "answer": q.answer,
            "image": image,
            "explanation": None,
        })
    if own_dir.is_dir() and not any(own_dir.iterdir()):
        own_dir.rmdir()

    json_path = data_dir / f"group-{g}-{lang}.json"
    json_path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    review_path = data_dir / (f"review{'' if g == 1 else f'-g{g}'}{'' if lang == 'en' else f'-{lang}'}.html")
    write_review(review_path, g, lang, records, {q.number: q.page for q in questions},
                 uncertain, pdf_path.name)

    with_img = sum(1 for r in records if r["image"])
    print(f"OK: {len(records)} questions, numbers 1..{len(records)}, all answers in range,")
    print("    every answer line agrees with the bold option in the PDF.")
    print(f"    {with_img} with a picture, {len(records) - with_img} without "
          f"({total_bytes / 1024:.0f} KB of new WebP).")
    if args.share_images_with:
        print(f"    cross-check with {args.share_images_with}: same numbers, answers, option counts "
              f"and pictured questions.")
        print(f"    {shared} of {with_img} pictures identical to the {args.share_images_with} edition "
              f"and shared (worst difference {worst_diff:.2f}/255).")
    print(f"    option counts: " + ", ".join(
        f"{k} options x{sum(1 for r in records if len(r['options']) == k)}" for k in range(2, 6)))
    print(f"    wrote {json_path.relative_to(ROOT)}, {review_path.relative_to(ROOT)}"
          + (f", {own_rel_dir}/" if total_bytes else ""))
    if uncertain:
        print(f"UNCERTAIN image mapping ({len(uncertain)} question(s)):")
        for n in sorted(uncertain):
            print(f"  - question {n}: " + "; ".join(uncertain[n]))
    else:
        print("    image mapping: no uncertain questions.")
    no_img = [r["number"] for r in records if not r["image"]]
    print(f"    questions without a picture: {no_img}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
