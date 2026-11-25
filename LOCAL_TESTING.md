# EduSuite AI: local setup and testing guide

This guide gets the whole product running on one Windows PC and tells you what to test and what you should see. Everything runs locally: the server parts in Docker, and the desktop app on your PC. You don't need a server, a domain or any paid account. Real AI is optional.

- **Setup time:** about 15 minutes the first time, mostly downloads.
- **Afterwards:** two commands a day.

---

## 1. What you need

| | |
|---|---|
| Windows 10 or 11 | |
| **Docker Desktop** (WSL 2 backend) | Started, with "Engine running" at the bottom left. |
| **Node.js 26** | `node --version` shows `v26…`. |
| **Git** | |
| **At least 10 GB free on C:** | Docker stops working ("read-only file system") when the drive fills up. |

---

## 2. Keys and secrets

You don't have to create anything to start. Locally, the app works without any key: AI buttons return sample answers (fixture mode).

| What | Needed locally? | Where it comes from |
|---|---|---|
| Database password, login signing secret (`JWT_SECRET`), storage keys, backup password | **Yes, created for you** | `npm run stack:env` (part of `local:setup`) writes them into `infra/.env.local` with fresh random values. |
| **Anthropic API key** (real AI) | Optional | Your Anthropic account. See 2.1. |
| **Sentry DSN** (error reports) | Optional, usually off locally | A Sentry project. See 2.2. |
| Domains, deploy SSH keys, code-signing certificate, off-site backup keys | No | Only for the real server; see `docs/operations/deploy-checklist.md`. |

**Rules for every key:**
- It goes only in `infra/.env.local`. That file is git-ignored and must never be committed.
- Never paste it into a chat, an issue, a screenshot or a document.

### 2.1 Anthropic API key (to try real Claude answers)

1. Sign in at **console.anthropic.com**, then go to **API keys → Create key**. Copy it once; it isn't shown again.
2. Open `infra/.env.local` in a text editor and set:

   ```ini
   ANTHROPIC_API_KEY=<your key>
   AI_MODE=live
   ```

   `AI_MODE` choices:
   - `fixture` (default): sample answers, no key needed, free.
   - `live`: real Claude answers.
   - `record`: real answers, also saved under `apps/api/fixtures/ai/` so later `fixture` runs replay them. Use it once per job type to judge the quality of Hindi output.
3. Apply it:

   ```powershell
   npm run stack:up
   ```

4. Check it took effect:

   ```powershell
   npm run local:check
   ```

   It should say `AI_MODE=live with an Anthropic key set`. In the app, the yellow "AI फिक्स्चर मोड" badge disappears from the header.

**Costs and models:**
- Real runs cost money on your Anthropic account. Every job is still limited by the institute's AI credits.
- The model is `claude-opus-5-5` (`AI_MODEL`). To use another model for one job type, set for example `AI_MODEL_DECK_QUIZ=claude-sonnet-5-5`.

To go back to free sample answers, set `AI_MODE=fixture` and run `npm run stack:up` again.

### 2.2 Sentry (optional error reports)

Error reporting is off unless a DSN is set. Only unexpected errors are sent, with no student data, request bodies or user details (DN-068).

- **Server (API and AI worker):** set `SENTRY_DSN=<DSN of a Sentry project>` in `infra/.env.local`, then run `npm run stack:up`.
- **Desktop app:** the DSN is fixed when the app is built. Set the environment variable `EDUSUITE_SENTRY_DSN` before `npm run build` (or before a release build).

---

## 3. First-time setup

Run these from the repo folder (`edusuite_ai`) in PowerShell.

1. Install the packages:

   ```powershell
   npm install
   ```

2. Set everything up in one go. This creates `infra/.env.local`, builds and starts the Docker stack, sets up storage, loads the demo data and builds the desktop app:

   ```powershell
   npm run local:setup
   ```

   It's safe to run again; it never deletes data.

3. Check the PC is ready:

   ```powershell
   npm run local:check
   ```

   Every line should say `OK`, ending with `All good`. Any `FAIL` line names the fix.

4. Open the app:

   ```powershell
   npm run electron:dev
   ```

The test logins and their passwords are in `apps/api/src/scripts/seed.ts`. They are demo accounts for local testing only.

---

## 4. Every day

| To | Run |
|---|---|
| Start the server parts | `npm run stack:up` |
| Open the app | `npm run electron:dev` |
| Open the app with hot reload (developers) | `npm run dev:all` (starts the stack if needed, Vite and Electron) |
| See server logs | `npm run stack:logs` |
| Check everything is healthy | `npm run local:check` |
| Stop the server parts (data is kept) | `npm run stack:down` |

Only one copy of the app can be open at a time. A second copy closes at once.

**Useful addresses while the stack runs:**
- `http://localhost:3000/ready`: health of the database, Redis and storage.
- `http://localhost:3000/docs`: the API documentation (every endpoint, with its fields and who may call it).

---

## 5. Logins

| Employee code | Role | Branch |
|---|---|---|
| `DEMO-SA` | Super admin | Main (sees the whole institute) |
| `DEMO-BA` | Branch admin | Main |
| `DEMO-T` | Teacher | Main |
| `DEMO-TY` | Typist / DTP | Main |
| `DEMO-C` | Counselor | Gita Bhavan (second branch) |
| `DEMO-PA` | EduSuite operator (sells AI credits) | EduSuite's own institute |

You can also sign in with the email or the 10-digit phone number from the seed file.

---

## 6. What to test and what to expect

Tick each item as you go. "Expect" is what a correct build does. Anything different is a bug worth reporting, with the role, the screen and what you saw.

### 6.1 Signing in and sessions

| Do | Expect |
|---|---|
| Sign in with a wrong password | A red message: "ID या पासवर्ड गलत है।" Nothing else happens. |
| Wrong password 5 times for one user | "कई गलत प्रयासों के कारण खाता 15 मिनट के लिए रोका गया है।" The account is locked for 15 minutes; an admin's password reset unlocks it. |
| Many sign-in attempts quickly (more than 10 a minute) | "बहुत ज़्यादा प्रयास। थोड़ी देर बाद कोशिश करें।" Wait a minute. |
| Sign in correctly, close the app, open it again | You are still signed in. Sessions last until 23:59 that day. |
| Header → लॉगआउट → हाँ, लॉगआउट | Back to the login screen. Reopening the app asks you to sign in again. |
| Header → हिन्दी / English | Every screen switches language at once. Names and saved text stay as typed. |

### 6.2 Teacher (`DEMO-T`): AI tools, saving and history

The header shows **AI क्रेडिट: N**, the institute's remaining credits. Each AI button shows its price. Locally, answers are samples (fixture mode, with "AI फिक्स्चर मोड" in the header), but credits are still charged, so the whole flow can be tested for free.

| Screen | Do | Expect |
|---|---|---|
| **PPT** | Type a topic, press "AI से स्लाइड बनाएँ · 1 क्रेडिट" | A progress bar, then slides fill the editor and the title fills. Credits drop by exactly 1. The status says "बिना सेव किए बदलाव" (unsaved). |
| PPT | Press **सेव करें** | "सेव हो गया · time". |
| PPT | Press **नया** after saving | The screen clears without asking. |
| PPT | Edit something, then press नया or click another sidebar item | It asks first. "रुकें" keeps your work. |
| PPT | **इतिहास** → search your title → **खोलें** | The deck comes back exactly as saved, showing "सेव हो गया". |
| PPT | Download PPTX | A `.pptx` that opens in PowerPoint, with the institute's own name only. |
| **Question paper** | Fill subject and topics, then AI (2 credits) | Sections MCQ → short → long; the total marks are shown before you pay. |
| **DPP** | AI (1 credit) with questions already written | Your questions stay; the AI questions are added after them. The printed sheet shows no answers. |
| **Lesson plan** | AI over a written plan | It asks before replacing it and states the credit cost. Cancelling costs nothing. |
| **Doubt solver** | A typed doubt or a photo, then AI | An answer, steps, a common mistake and similar questions. |
| **YouTube** | Fill the thumbnail fields, then AI | Title (100 characters at most), description and tags. |
| **Book creator** | AI on a chapter (2 credits) | Theory paragraphs, exam points and practice MCQs. |
| **Screenshot → MCQ** | Upload 1–20 PNG/JPG screenshots, then AI (1 credit each) | Questions fill. Answers the AI guessed are flagged "यह उत्तर स्क्रीनशॉट पर नहीं था…" until you confirm them. |
| **Deck → interactive quiz** | Upload a PDF deck, fill exam and subject (10 credits) | Questions to review. Download stays blocked until every flagged answer is ticked or changed. "क्विज़ खोलें" plays it. The HTML carries only your institute's name. |
| Any AI box | Press **रोकें** while a job runs | "रोक दिया गया", and the credits come back. Jobs finish in under a second in fixture mode; to test this, stop the worker first (6.7). |
| Any screen | Run out of credits | "आपके संस्थान के AI क्रेडिट कम हैं…", and nothing is charged. |

A teacher must **not** see: staff management, the audit and usage screen, fee receipts, or settings. Typing those addresses sends you back to the dashboard.

### 6.3 Counselor (`DEMO-C`): students, fees and notices

| Do | Expect |
|---|---|
| Fee receipts → **नया छात्र** | The roll number is suggested (`DEMO-GTB-2026-000n`); you may type your own. |
| Add the student with a photo and a total fee, e.g. ₹12,000 | "छात्र जुड़ गया: DEMO-GTB-…". Totals show fee, paid and due. |
| Try a receipt larger than the amount due | The button stays disabled. |
| A receipt for ₹5,000 by UPI | A printable receipt numbered `DEMO-GTB/2026-27/00000n`, showing "बकाया ₹7,000". |
| Double-click the receipt button | Only one receipt is created. |
| A receipt dated more than 7 days ago, or in the future | Refused. |
| **रसीदें** tab | The receipt is listed with reprint, and there's no cancel button (counselors can't cancel). |
| **ID कार्ड** tab | A card with the photo, course, batch, guardian, phone and session; only the card prints. |
| Notices → AI draft (1 credit) | A WhatsApp text and a formal circular with the institute's own name. Missing facts appear as [brackets]. |
| Image Studio | Templates work; the AI copy box is **not** shown to counselors. |

A counselor must **not** reach the teaching AI tools (PPT, papers and so on).

### 6.4 Super admin (`DEMO-SA`) and branch admin (`DEMO-BA`)

| Do | Expect |
|---|---|
| Staff management: add a teacher, block, unblock, reset a password | It works, and there is no "delete" anywhere. Passwords are never shown. A blocked user is signed out within 15 minutes. |
| Branch admin: try to give someone an admin role | Not offered. A branch admin manages only teachers, typists and counselors of their own branch. |
| Fee receipts → find the counselor's student → रसीदें → रद्द करें | A reason is required. The row then shows "रद्द: …", the balance goes back up, and the number is never reused. |
| **AI उपयोग और ऑडिट लॉग** → usage | One row per job type for the month, with credits kept (refunds aren't counted). |
| Same screen → audit log | Who did what and when, filterable by group and date. It shows no passwords or tokens. |
| Settings (super admin) | The institute name, branding and branches can be edited. There is no API-key field. |
| Branch admin's audit and usage | Only their own branch's staff. |

### 6.5 EduSuite operator (`DEMO-PA`)

| Do | Expect |
|---|---|
| Sign in | You land on "AI क्रेडिट प्रबंधन" and see nothing else. Your own operator institute isn't listed. |
| Add 50 credits to the demo institute with a reason | A preview shows the balance after. The history row shows your reason and name. The teacher's header chip goes up by 50. |
| Take away more than the balance | Blocked. |
| Change a job's price | New jobs use the new price; teachers see it on the button. |

### 6.6 Crash safety

Most testers can't trigger a crash. If a screen ever shows "यह स्क्रीन नहीं खुल पाई", the header and sidebar must keep working, and "फिर से कोशिश करें" or another screen must recover it. Report what you did just before.

### 6.7 Testing "रोकें" (cancel an AI job)

Fixture answers come back too fast to stop, so pause the AI worker first:

```powershell
docker compose -f infra/docker-compose.yml -f infra/docker-compose.local.yml --env-file infra/.env.local stop worker
```

Start a job: it stays waiting. Press **रोकें**: it shows "रोक दिया गया" and the credits return. Then start the worker again:

```powershell
npm run stack:up
```

---

## 7. Automated tests

```powershell
npm run lint
```

```powershell
npm run typecheck
```

```powershell
npm test
```

```powershell
npm run test:e2e
```

- `npm test` runs the unit and API tests (about 170). The API tests use a separate `edusuite_test` database, so Docker must be running.
- `npm run test:e2e` opens the real desktop app in its own temporary profile and runs the main journeys: sign-in, teacher AI → save → history, roles, counselor fee receipt, and the English switch. It needs the stack running and seeded. Each run adds one "E2E छात्र …" student and one saved deck to the demo data.

---

## 8. When something goes wrong

Start with `npm run local:check`. It names most problems and their fix.

| Problem | Fix |
|---|---|
| Docker says **"read-only file system"** or **"input/output error"**, or WSL crashes | The C: drive is full. Free at least 5–10 GB, restart Docker Desktop, then `npm run stack:up`. `docker builder prune -af` frees Docker's build cache (it rebuilds when needed). |
| `/ready` shows `storage: "down"` | `npm run stack:init`, then `npm run stack:logs`. |
| `set POSTGRES_USER` (or similar) error | `infra/.env.local` is missing: `npm run stack:env`. |
| `required variable UPDATES_DOMAIN is missing` | Your `.env.local` is older than Phase 6: add the line `UPDATES_DOMAIN=updates.example.com`. |
| The app opens and closes at once | Another copy is already open; close it first. |
| "बहुत ज़्यादा प्रयास" on sign-in | More than 10 sign-ins a minute from this PC; wait a minute. |
| AI buttons say credits are low | Sign in as `DEMO-PA` and add credits to the demo institute. |
| AI jobs never finish | The worker isn't running: `npm run stack:up`, then check `npm run stack:logs`. With `AI_MODE=live`, check the key (`npm run local:check`). |
| Start completely fresh | `npm run stack:down -- -v`, then `npm run local:setup`. **This permanently deletes the local database, uploaded files and local backups.** |

More operator topics (backups and the restore drill, the 150-user load test, a test installer, ports) are in [`docs/runbooks/local-testing.md`](docs/runbooks/local-testing.md).
