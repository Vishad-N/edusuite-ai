# Frontend audit

- **Date:** 2026-11-20
- **Scope:** Step 1 of `master-build-prompt.md`. Read-only analysis; no code was changed.
- **Code read:** `src/App.jsx`, all 18 files in `src/components/`, `src/data/*`, `src/utils/motionHtmlGenerator.js`, `src/index.css`, `index.html`, `electron/*`, `package.json`.
- **Not verified:** I did not run the app, so layout at 1280×720 / 1920×1080, Devanagari wrapping and contrast ratios are judged from the Tailwind classes, not measured. A measured pass (axe + screenshots at both sizes) belongs in Track A.

**Legend for "Data source":** `SD` = `sampleData.js` import · `INL` = hard-coded inline in the component · `LS` = localStorage · `SS` = sessionStorage · `TMR` = `setTimeout` fake · `TPL` = string template built from inputs · `—` = not saved anywhere.

---

## 1. Findings that matter most

1. **Two screens ignore what the user types.** DoubtSolver's "Solve" waits 700 ms and shows the same train problem whatever was entered. LessonPlanner has no generate action at all; its inputs never change the plan.
2. **Screenshot → PPT attaches made-up questions to real screenshots.** `handleFileUpload` (`ScreenshotToPpt.jsx:303`) pairs every uploaded image with a sample question from `SAMPLE_SCREENSHOT_QUESTIONS`. A teacher who doesn't read every slide would present a question that isn't in the screenshot. This is the most harmful fake in the app.
3. **Login accepts anyone.** An unknown ID logs in as a new user, and any ID containing "super" becomes super admin with any password (`LoginScreen.jsx:91–105`). Master passwords `123`, `admin123` and `admin770` open every account (`:84`). The login page prints the default password.
4. **Two "Download" buttons only show an alert.** YouTube "थंबनेल डाउनलोड करें" and ImageStudio "Download" pop up a success message but save no file.
5. **Nothing is ever saved** apart from the user list (localStorage) and the language. No screen has history.
6. **Four screen titles are white on a light background.** NoticeHub, IdAndFeeReceipt, LessonPlanner and ImageStudio use `text-white` / `border-slate-800` headers left over from an older dark theme, so their h2 is effectively invisible on `bg-slate-100`.
7. **Accessibility is almost absent.** Across `src/components` there is 1 `aria-*`/`htmlFor`/focus-ring use in total. No label is tied to its input, there are no visible focus styles, the Header branch menu opens on hover only, and modals have no focus trap or Esc handling.
8. **Translations cover only the Header, Sidebar and Dashboard.** None of the 14 tool screens receives `t`. They mix hard-coded Hindi, English and Hinglish (for example SettingsModal and NoticeHub are English/Hinglish only).
9. **SettingsModal calls hooks after an early return** (`SettingsModal.jsx:21–28`). React requires hooks in the same order on every render, so toggling `isOpen` on a mounted component can throw "Rendered more hooks than during the previous render". Likely bug; not reproduced.

---

## 2. Shell and cross-cutting screens

### LoginScreen
| | |
|---|---|
| Purpose | Daily staff login: branch, ID/email/phone, password; plus 1-click demo logins |
| Roles | Everyone (pre-auth) |
| Data source | `employeeAccounts.js` via LS (`satyadhi_users_db`); TMR 400 ms; branch list INL |
| Missing states | No real error from a server; no lockout message; no "session expired" message; no offline state |
| Accessibility | Labels not tied to inputs; show/hide password button has no `aria-pressed`/label; error box has no `role="alert"`; `select-none` on the whole page blocks selecting text; amber-on-slate small text (`text-[10px]`/`[11px]`) is below comfortable size |
| Hindi/English | All hard-coded Hindi; no English; no `t` |
| Visual consistency | Glow blobs, gradients, `rounded-3xl`, confetti on login; differs from in-app modals |
| Fake / broken | "super" ID trick, master passwords, generic user creation, 1-click logins with visible passwords, branch chosen freely by the user (not checked) |

### Header
| | |
|---|---|
| Purpose | Brand, branch switcher, session, language, user chip, logout, settings |
| Roles | Everyone after login |
| Data source | `sampleInstitutes` (SD) held in `App` state; `t` |
| Missing states | No AI/server status; `apiKeySet` prop is passed but unused |
| Accessibility | Branch dropdown opens on `group-hover` only (unreachable by keyboard); language buttons lack `aria-pressed`; icon-only settings button relies on `title`; logout has no confirm |
| Hindi/English | Brand, logout label and city line hard-coded Hindi |
| Visual consistency | Fine-grained sizes (`text-[9px]`, `[10px]`, `[11px]`) below a usable floor |
| Fake / broken | The "branch" switcher actually switches **institutes** from sample data; the Minimise/Maximise/Close buttons have no handlers and duplicate Electron's own `titleBarOverlay` controls |

### Sidebar
| | |
|---|---|
| Purpose | Grouped navigation to the 14 tools |
| Roles | Everyone; "Users" item only when `role === "superadmin"` or `canManageUsers` |
| Data source | INL nav config + `t` |
| Missing states | No "coming soon"/disabled item state; no collapsed state |
| Accessibility | Buttons lack `aria-current="page"`; no `<nav>` landmark; no visible focus |
| Hindi/English | "यूजर व स्टाफ प्रबंधन" and badges hard-coded |
| Visual consistency | Badge text mixes Hindi/English ("नया", "Home", "WA") |
| Fake / broken | Shows every tool to every role (no permission matrix). The "गाइड" link does nothing |

### SettingsModal
| | |
|---|---|
| Purpose | Edit institute name/tagline/phone/city; store an AI key |
| Roles | Everyone (no role check) |
| Data source | Institute in App state (lost on restart); API key in LS (`edusuite_api_key`) |
| Missing states | No validation, no error state; "Saved!" is a 1.2 s timer |
| Accessibility | No `role="dialog"`/`aria-modal`, no focus trap, no Esc to close, labels not tied |
| Hindi/English | English and Hinglish only |
| Visual consistency | Uses sky/indigo gradient: the only screen off the navy/amber palette |
| Fake / broken | Asks for a **Google Gemini** key, which nothing uses and which the plan forbids on PCs; hooks after early return (see §1.9) |

---

## 3. Tool screens

| # | Screen | Purpose | Roles today → plan | Data source | What's fake |
|---|---|---|---|---|---|
| 1 | Dashboard | Hero, quick links, stats, tool grid | All → all | `t` (stats are hard-coded strings like "32 बैचेस") | Stats and "LIVE" schedule are static text |
| 2 | PptMaker | Topic → slides → .pptx | All → Super, Branch, Teacher, DTP | SD `presentationPresets`; TMR 900 ms; TPL fallback | Matches a preset by substring or fills a generic 4-slide template |
| 3 | ScreenshotToPpt | Screenshots → MCQ review → PPTX / motion HTML | All → Super, Branch, Teacher, DTP | INL `SAMPLE_SCREENSHOT_QUESTIONS`; TMR (3 chains, up to 2.4 s) | Fake "OCR" stages; real uploads get sample questions (§1.2) |
| 4 | QuestionPaperMaker | Paper with sections + answer key | All → Super, Branch, Teacher, DTP | SD `sampleQuestionPapers`; TMR 800 ms; TPL | Same generic 6 questions for any subject |
| 5 | NotebookDppMaker | DPP sheet, Cornell notebook, OMR | All → Super, Branch, Teacher, DTP | INL 5 sample questions | No generate at all; DPP is always the same 5 questions |
| 6 | LessonPlanner | Chapter → day-wise plan | All → Super, Branch, Teacher, DTP | INL plan | Inputs never change the plan (§1.1) |
| 7 | DoubtSolver | Question → steps, trick, similar Qs | All → Super, Branch, Teacher, DTP | INL solution; TMR 700 ms | Always shows the train solution (§1.1) |
| 8 | YouTubeStudio | Thumbnail canvas + title/desc/tags | All → Super, Branch, Teacher, DTP | TPL; INL presets; fixed tag list | "Download" is an alert (§1.4) |
| 9 | NoticeHub | WhatsApp / formal notice | All → Super, Branch, Teacher, Counselor | SD `sampleNotices` | No input or generation; picks one of the samples |
| 10 | BookCreator | Cover, index, chapters, MCQs; print | All → Super, Branch, Teacher, DTP | SD `sampleBooks`; TMR 900 ms; TPL | Chapters are generic text; MCQ options are "विकल्प 1–4" |
| 11 | ImageStudio | Poster canvas + AI image prompt | All → all five roles | INL presets | "Download" is an alert; mentions "Gemini / Imagen" |
| 12 | IdAndFeeReceipt | ID card + fee receipt; print | All → Super, Branch, Counselor | Form state only (—) | Receipt # is always `REC-2026-0149`, date always "18 Nov 2026"; barcode is the text `[BARCODE]`; "GST receipt" claimed with no GST fields |
| 13 | TeacherDesk | Faculty profile, schedule, syllabus | All → **not in the plan's matrix** | INL faculties, schedule, syllabus | Anyone can switch to any faculty's profile; "लाइव अपडेट" label is static |
| 14 | UserManagement | Add/edit/block/delete staff | Super or `canManageUsers` → Super, Branch (own branch) | LS via `employeeAccounts.js` | Plain-text passwords shown in the table with a reveal button; delete is permanent; Branch admin can't open it today |

### Missing states, per tool screen

| Screen | Loading | Empty | Error | Disabled | Success |
|---|---|---|---|---|---|
| Dashboard | ✗ | ✗ | ✗ | n/a | n/a |
| PptMaker | timer only | ✗ | `alert()` on export | partial | confetti |
| ScreenshotToPpt | timer bar | upload drop zone | `alert()` on export | partial | confetti |
| QuestionPaperMaker | timer only | ✗ | ✗ | partial | confetti |
| NotebookDppMaker | ✗ | ✗ | ✗ | ✗ | ✗ |
| LessonPlanner | ✗ | ✗ | ✗ | ✗ | "copied" |
| DoubtSolver | timer only | ✗ (empty question accepted) | ✗ | partial | confetti |
| YouTubeStudio | ✗ | ✗ | ✗ | ✗ | `alert()` |
| NoticeHub | ✗ | ✗ | ✗ | ✗ | "copied" |
| BookCreator | timer only | ✗ | ✗ | partial | confetti |
| ImageStudio | ✗ | ✗ | ✗ | ✗ | `alert()` |
| IdAndFeeReceipt | ✗ | ✗ | ✗ (no validation; negative balance possible) | ✗ | ✗ |
| TeacherDesk | ✗ | ✗ | ✗ | n/a | n/a |
| UserManagement | ✗ | ✗ (no "no results" row) | `alert()` | ✗ | confetti |

Every clipboard copy calls `navigator.clipboard.writeText` without `await` or `catch`, so a failure still shows "copied".

### Accessibility, applies to every tool screen
- `<label>` elements are never tied to inputs (`htmlFor`/`id` missing everywhere).
- No `focus-visible` styles; `focus:outline-none` removes the browser's ring on most inputs.
- Clickable `<div>` cards (Dashboard tool grid, TeacherDesk launchpad) are unreachable by keyboard.
- `alert()`/`confirm()` are used for errors and deletes.
- Progress bars aren't announced (`aria-live` missing).
- Small text: heavy use of `text-[9px]`–`text-[11px]`, which is hard to read in Devanagari, where matras need extra height.
- `select-none` on UserManagement and Login blocks copying IDs and emails.
- `index.html` has `lang="en"` although Hindi is the default; screen readers will mispronounce Hindi.

### Hindi/English gaps
`translations.js` has 88 keys per language, all for the Header, Sidebar and Dashboard. Everything else is hard-coded:
- Hindi only: LoginScreen, Header logout and city line, TeacherDesk, UserManagement, ScreenshotToPpt, NotebookDppMaker, DoubtSolver, YouTubeStudio.
- English or Hinglish only: SettingsModal, NoticeHub, ImageStudio, LessonPlanner, IdAndFeeReceipt header.
- Mixed: PptMaker, QuestionPaperMaker, BookCreator.
- Dates are formatted with a fixed `hi-IN` locale on Login, and are hard-coded elsewhere.

### Spacing, type and colour inconsistencies
- **Type:** sizes used include 9, 10, 11, 12, 14, 16, 20, 24 and 30 px, with weights from medium to black (900). Hierarchy is carried by colour and badges more than by size.
- **Radius:** `rounded-lg`, `-xl`, `-2xl` and `-3xl` are all used for similar cards and modals.
- **Colour:** each tool has its own accent (blue, rose, teal, violet, indigo, emerald, purple, orange, sky). Two dark-theme leftovers (§1.6). Gradients and glow shadows on most hero banners.
- **Spacing:** padding varies between `p-4`, `p-5`, `p-6` and `p-8` for equivalent cards.
- **Buttons:** primary actions use at least six different colour treatments, and button placement differs per screen (top-right on most, inside the form on others).

---

## 4. User journeys

✗ = broken or fake · ⚠ = works but only in this browser session · ✓ = works

### A. Teacher makes a lecture PPT
1. Log in ✗ (any password works via master passwords)
2. Land on Dashboard ✓ (stats are fake)
3. Open PptMaker from the sidebar ✓ (no role check)
4. Fill topic, grade, subject, slides ✓ (`slidesCount` is ignored)
5. Generate ✗ (900 ms timer, preset or generic template)
6. Live progress ✗ (button label only)
7. Preview slides ✓
8. Edit ✗ (no slide editing)
9. Save ✗ (nothing is saved)
10. Export .pptx ✓ (real pptxgenjs file, generated in the browser)
11. Find it again in history ✗ (no history)

### B. Teacher turns screenshots into an MCQ deck
1. Upload screenshots ✓ (images load)
2. "Scan" ✗ (timers, no OCR)
3. Review questions ✗ (pre-filled with **unrelated** sample questions)
4. Edit options/answer ✓ (in memory)
5. Save ✗
6. Export PPTX / motion HTML ✓ (real files)
7. History ✗

### C. Admin manages users
1. Log in as super admin ✗ (1-click button, or any ID with "super")
2. Open "Users" ✓ (super admin only; Branch admin is locked out, unlike the plan)
3. Add a user ✓ to localStorage on this PC only; default password "123"; ID is random and can collide
4. Edit ✓ (password shown in plain text)
5. Block ✓ (block is enforced only by the local login screen, and master passwords don't bypass it)
6. Delete ⚠ (permanent, no audit trail; the plan only has block)
7. Another PC sees the change ✗ (localStorage is per PC)

### D. Typist issues a fee receipt
1. Log in as typist ✗ (fake login)
2. Open "छात्र ID कार्ड & फीस रसीद" ✓ (but the plan does **not** allow DTP/Typist to issue receipts; only Super, Branch and Counselor)
3. Type student details ✓ (no student lookup; no validation)
4. Generate a receipt number ✗ (always `REC-2026-0149`)
5. Save ✗ (nothing stored)
6. Print ✓ (`window.print`; prints the whole window, styled by `@media print`)
7. Cancel a receipt ✗ (not possible)
8. Find it again ✗

> The prompt's journey D uses a typist, but the plan's permission matrix gives that role no access to fees. See Q-04 in `backend-readiness.md`.

### E. Logout and session expiry
1. Logout ✓ (clears sessionStorage; no confirm)
2. Session expiry ✗ (none; the session lasts until the window closes)
3. Return to the same screen after login ✗ (no routing; always lands on Dashboard)
4. Reload ✗ (the active tab is lost; there are no deep links)
5. Unsaved-changes guard ✗ (none)

---

## 5. Other notes for later tracks
- **Navigation:** there is no router. Tabs are a `useState` in `App.jsx`, so deep links and "return to where you were" need one (see Q-07).
- **XSS:** the motion HTML player builds HTML by string replacement without escaping. A question containing `</script>` breaks out of the script, and the iframe runs with `sandbox="allow-scripts allow-same-origin"`, a combination that lets the frame remove its own sandbox. With `webSecurity: false` this matters. Listed as a security risk in the backend report.
- **Print:** `@media print` hides `header`, `aside` and `button`. That works today, but any new primitive that renders a `<button>` inside printed content will disappear on paper. Keep this in mind for Track A.
- **Dead files:** `src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg` and `hero.png` appear unused (from the Vite template).
