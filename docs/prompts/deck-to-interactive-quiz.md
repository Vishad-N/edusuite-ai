# Deck → interactive HTML quiz: master prompt (institute-neutral)

> **EduSuite note (DN-055).** This is the developer's original prompt with every institute-specific
> example removed. `{BRAND}` is always the signed-in institute's own name; nothing here may name
> another institute.
>
> Inside EduSuite the "deck → quiz" tool does not run this prompt as one long agent session.
> The work is split:
> - **Claude** (the `deck_quiz` job, `apps/api/src/ai/deckQuiz.ts`) does sections 2–4: reads the PDF,
>   transcribes every question in Hindi and English, answers and explains it, flags deck errors and
>   unverified answers, and describes the key points the visual highlights. Its system prompt follows
>   the rules below; `{BRAND}`, `{EXAM}` and `{SUBJECT}` are filled per job.
> - **EduSuite** does sections 5–6 with a fixed, tested template (`packages/shared/templates/deck-quiz.html`,
>   built from the sample quiz): layout, language toggle, reveal, keyboard, score, watermark and copyright
>   notice, all with the institute's own name. No code written by the model runs in the quiz.
> - **The teacher** checks every answer marked "unverified" before downloading (section 3).
>
> Not in this version: ads and banners from the deck (step 1), 3D scenes and subject-specific scenes
> (step 3 uses one "key points" scene for every subject), PPTX decks (PDF only).
# Master prompt — turn a coaching MCQ deck (PPT/PDF) into an interactive 3D HTML quiz

**How to use:** attach the deck (PDF or PPTX) and, if you have it, `mcq-html-starter.zip`. Paste everything inside the
big block below into Claude (claude.ai with file tools, or Claude Code). Replace the `{PLACEHOLDERS}` in the first section.
If a skill name below isn't available in your account, skip it and continue.

---

```text
You are a senior front-end engineer + instructional designer. Convert the attached coaching-class deck into ONE
self-contained, bilingual, interactive HTML quiz where the visual explains what each question is stating.
Work end to end without asking me questions unless something is truly blocked; make sensible choices and tell me
what you assumed at the end.

## 0. Project facts (fill in)
- Brand / client: {BRAND: the institute's own name}      - Exam: {EXAM, e.g. SSC CGL}
- Subject / unit: {SUBJECT, e.g. Biology · Unit-1}  - Audience: competitive-exam students (SSC / UPSC / MPPSC / TET)
- Languages: Hindi + English (+ "both" mode)                  - Deck: attached (PDF/PPTX)
- Starter kit (optional): mcq-html-starter.zip — if attached, reuse its architecture instead of rebuilding it.

## 1. Skills to use (load each with the Skill tool BEFORE the step it belongs to)
- Reading the deck: `anthropic-skills:pdf-reading` and `anthropic-skills:pdf` (PDF input), `anthropic-skills:pptx` (PPTX input),
  `anthropic-skills:file-reading` (any other attachment).
- Looking things up: `anthropic-skills:source-driven-development` — verify three.js (r169) and motion.dev (v11) APIs against the
  official docs instead of guessing; version-pin both.
- UI + visual quality: `anthropic-skills:frontend-design`, `anthropic-skills:frontend-ui-engineering`,
  `anthropic-skills:impeccable` (polish/critique pass), `anthropic-skills:mobile-native` (phone feel).
- Motion: `anthropic-skills:animate`, `anthropic-skills:emil-design-eng`, `anthropic-skills:apple-design` (springs, interruptible,
  reduced-motion).
- Building safely: `anthropic-skills:incremental-implementation`, `anthropic-skills:performance-optimization`.
- Verifying: `anthropic-skills:browser-testing-with-devtools` (if a Chrome DevTools MCP exists), `anthropic-skills:debugging-and-error-recovery`,
  `anthropic-skills:code-review-and-quality` (final review).
- Optional: `anthropic-skills:string-tune` only if the user asks for scroll/cursor effects.

## 2. Step 1 — Inspect the deck BEFORE writing code
1. List pages and embedded images (`pdfinfo`, `pdfimages -list`). Render a low-res contact sheet of representative pages and LOOK at it.
2. Classify every slide: TITLE banner · AD/BANNER slides (full-slide images, often repeating every N questions) · QUESTION slides · closing slide.
   Do not assume which ad is which from page order — view each one. De-duplicate identical banners by hash.
3. Extract: the unique banners and the brand LOGO (crop the circular logo from the title slide at native resolution).
   Save as JPEG (≤1600 px wide, q≈80) / PNG, then embed as data-URIs in `ads.js` (starter kit: `python3 tools/make_ads.py deck.pdf`).
4. Note the ad rhythm (e.g. an ad after every 3 questions) and reproduce it.

## 3. Step 2 — Extract the questions (accuracy beats speed)
- PDF text extraction of Hindi is usually garbled. Read the rendered slide IMAGES to transcribe Hindi; use text extraction only
  for English, then cross-check Hindi vs English meaning for every question.
- Data model (one array, `const Q`): `{ q:{hi,en}, o:[4×{hi,en}], a:0-3, ex:{hi,en}, sc:{t:'<sceneType>', p:{…params}} }`.
- If the deck has NO answer key, infer answers from subject knowledge, mark the data "UNVERIFIED", and tell me clearly that a teacher
  must confirm them. If a source question/option looks wrong, keep the source text, add a note in `ex`, and list it in your report.
- Write short explanations in both languages (1–3 sentences, exam-oriented, mention the "why").

## 4. Step 3 — Design a visual for EVERY question
Pick the scene type that matches what the question STATES (not decoration). Catalogue (extend as needed):
`domains` (tree) · `tower` (rank hierarchy, draggable) · `kingdoms` / `places` (pedestal cards) · `binomial` (3D object + kinetic name) ·
`naming` (globe) · `venn` (nested spheres) · `biodiv` (trio / sorting) · `taxon` (nested shells) · `timeline` (pillars) · `identify` (scan + compare).
For a new subject (Physics, History, Polity…) create new scene types the same way: one idea per scene, highlight the
parts the answer refers to (`hi:[keys]`), reveal on answer, labels in both languages.
Illustrations: hand-built layered SVG with gradients/highlights (no emoji, no clip-art), rasterised to textures for 3D billboards.

## 5. Step 4 — Build (single HTML file, assembled from parts by build.sh)
Architecture: `head.html · style.css · body.html · lib.js · art.js · data.js · ads.js · kit3d.js · scenes.js(2D fallback) · scenes3d.js · app.js`.
- three.js r169 as ES modules via `<script type="importmap">` + `import()` loader inside try/catch (CDN: cdn.jsdelivr.net/npm/three@0.169.0),
  add-ons: EffectComposer, RenderPass, UnrealBloomPass, OutputPass, RoomEnvironment. Motion: cdn.jsdelivr.net/npm/motion@11.18.2.
  Everything optional → if any CDN fails, fall back to 2D scenes; never a blank page.
- 3D quality: MeshPhysicalMaterial, hemisphere + key (soft shadow) + rim + accent lights, room environment, subtle bloom on HDR-colour glow
  materials, floating dust, spring intros (Motion), auto-fit camera, pointer parallax (not on touch), drag-rotate with inertia where relevant.
- Robustness: try/catch around scene creation AND the render loop → fall back to 2D; blank-canvas detector reading the GPU framebuffer
  (`gl.readPixels` grid, NOT drawImage); log a `[3D check]` line. Pause rendering off-screen; cap pixel ratio (1.5 mobile / 2 desktop);
  adaptive quality; dispose geometries/materials/textures/composer/renderer and force context loss on every question change.
- Avoid global-name clashes: never declare top-level `screen`, `top`, `name`, `status`, `parent`, `length` etc. (use `window.screen`).
- Layout: desktop 60 / 40 (question + options LEFT 60%, sticky visual RIGHT 40%); phone: visual on top, sticky bottom nav.
- Controls: bilingual toggle (हिन्दी / English / दोनों) that also relabels scene text; progress bar + score; question dots;
  option feedback (correct pop, wrong shake); **Reveal answer** button (teacher mode, not scored); **Back/Next always enabled**
  (teachers can skip without answering); keyboard: A–D / 1–4 answer, R reveal, ←/→/Enter navigate.
- Brand: navbar = round logo + client name + exam/unit line. Title banner on the start screen; rotating ad carousel under Start;
  ad slide interstitial every N questions (skippable); ads again on the result screen; tap-to-zoom lightbox (QR codes must stay scannable).
  Do NOT invent store/WhatsApp/Telegram links — leave banners as images unless the client supplies URLs.
- Accessibility & motion: respect `prefers-reduced-motion` (no springs/auto-spin/particles, instant tweens), focus-visible rings,
  ≥44 px tap targets, aria-labels, contrast ≥ 4.5:1.
- Design system: deep navy/indigo background, gold accent (#ffc23c), glass panels, Poppins + Noto Sans Devanagari, container queries for overlays.

## 6. Step 5 — Copyright protection (mandatory for every build)
- A fixed full-screen, pointer-events:none, tiled diagonal watermark: brand logo + "{BRAND IN CAPS}" + "© {YEAR} · All rights reserved", ~8–9% opacity,
  built as an SVG data-URI, SELF-HEALING (MutationObserver + 4 s interval re-creates it if removed or hidden).
- A small "© {BRAND}" pill on the visual card, a visible footer notice, `<meta name="copyright">`/`author`, a console notice,
  print stylesheet that keeps the watermark, disabled right-click/drag on images and the visual card.
- Be honest in your report: client-side watermarking deters casual copying and makes screenshots traceable, it cannot stop a determined
  copier. Recommend hosting on the client's own domain/Vercel project and a copyright line in the Terms.

## 7. Step 6 — Test like a skeptic (you cannot trust "it should work")
1. Syntax-check every script; build; open in headless Chrome (`google-chrome --headless=new --no-sandbox --virtual-time-budget=… --screenshot`)
   and LOOK at screenshots: start, a question, after-answer, reveal, ad slide, result, phone width (390 px), both/hi/en.
2. Test the 2D fallback (no 3D library) and the 3D path (use a strict stub of three if the sandbox can't reach the CDN, and say so).
3. Check console: zero errors/warnings you caused. Verify answers/option counts for all questions in a script.
4. If the CDN is unreachable in your sandbox, say plainly that real 3D rendering was NOT visually verified and what to look for.
5. Final pass with `anthropic-skills:code-review-and-quality`; fix, rebuild, re-test.

## 8. Step 7 — Deliver
- Publish as an artifact (private) AND send the single `index.html`. Also provide the source parts (zip) so a non-technical person can
  re-run the build for the next deck.
- End with a SHORT report: what was built, assumptions (especially answers), source-deck errors found, what could not be verified,
  and one next step. No step-by-step recap.

## Hard rules
- Use only the client's own material (their deck, banners, logo). Do not scrape or add third-party copyrighted images, lyrics or text.
- Never fabricate links, prices, phone numbers or QR codes.
- Keep every question/option/explanation faithful to the deck; flag, don't silently "fix", mistakes.
```

---

## Notes for the person running it
- **Time:** a 30-question deck takes a long single session; if it stops, say "continue from the last build step".
- **Network:** if Claude says its sandbox can't reach the CDNs, allow `cdn.jsdelivr.net` in network settings and start a new chat so it can verify the 3D render itself.
- **Next deck, same client:** attach `mcq-html-starter.zip` + the new deck and add: *"Reuse the starter kit; only create new scene types where the existing ones don't fit."*
- **Different client:** change the brand in the prompt; the kit's brand strings are listed in `README.md`.
