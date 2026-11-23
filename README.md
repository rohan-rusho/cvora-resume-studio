# CVora — Professional Resume Studio

**Create Your Future. One Resume at a Time.**

A premium CV & resume builder: 100 real templates, a guided multi-step editor,
live preview, design customization, ATS checker, cover letter builder, PDF
export, CV upload & import, and a personal dashboard. Static web app — no build
step, no dependencies beyond Google Fonts.

## What is new in v1.2.0

- **100 templates** — 45 new ones in 9 new categories: Executive (5),
  Healthcare (5), Legal (5), Engineering (5), Sales (5), Finance (5),
  Education (5), Hospitality (5), Freelance (5). Category chips on the
  landing page now show the count per category.
- **Upload an existing CV** (`js/import.js`) — upload a PDF, Word (.docx),
  TXT or Markdown file, or paste the text, and CVora reads it into the
  editor. Name, title, contact details, summary, jobs, education, skills,
  projects, certifications and languages are parsed from the text. From the
  editor it **replaces the current CV's content** (template and design are
  kept); from the dashboard it creates a brand-new CV. Everything stays
  editable afterwards. PDF uses pdf.js and DOCX uses mammoth.js, loaded on
  demand from a CDN — TXT and pasted text work fully offline. Nothing is
  uploaded to a server.
- **Word (.doc) export** — download an editable Word document that opens in
  Microsoft Word, LibreOffice and Google Docs, keeping the CV design.
  Export now covers PDF, PNG, JPG, DOC, TXT, HTML and JSON.
- **Next / Previous buttons** — every editor step now has Previous / Next at
  the bottom, with a "Step X of 9" counter. Next moves to the next section
  automatically and scrolls to the top; the last step becomes "Review your
  CV" and opens the preview. New users no longer have to scroll up to find
  the step buttons.

## What works in this build (v1.2.0)

- **100 templates, genuinely different** — Professional (8), Modern (8),
  Minimalist (7), Creative (7), Technology (6), Student (5), Academic (4),
  Specialized (5), Premium (5), Executive (5), Healthcare (5), Legal (5),
  Engineering (5), Sales (5), Finance (5), Education (5), Hospitality (5),
  Freelance (5). Each has its own layout, header, font, accent, skill
  style, divider and photo treatment. Every thumbnail is the real template
  rendered with sample data — never a generic image.
- **Full customization** — override any template's layout (one column, two
  columns, sidebar left/right, banner), header style, accent color, sidebar
  color, page background, 11 fonts, skills display (text / bars / dots /
  chips), section heading style, divider style, photo shape, name/body size,
  line height, margins, spacing, A4 / US Letter — plus reset. Dark mode for
  the app itself.
- **Multi-format export** — PDF (print, real document), PNG, JPG, Word (.doc),
  plain-text TXT, standalone HTML, and JSON backup with import. PNG/JPG render
  the actual document (web fonts fall back to system fonts in the image — a
  browser limitation, stated in the UI).
- **Multi-step editor** — Personal, Summary, Experience, Education, Skills,
  Projects, Certifications, Languages, Additional sections. Add / edit /
  delete / reorder everywhere; unlimited entries.
- **Live preview** — every keystroke updates the document; zoom, fit,
  full-screen, page estimate. Switching templates never erases information.
- **CV completeness meter** and **version history** — automatic snapshots as
  you edit, restore any earlier version.
- **ATS checker** — 10-point checklist with a score, plus keyword matching
  against a pasted job description.
- **Writing helpers (on-device)** — summary generator, concise rewrite,
  grammar check, stronger achievement bullets, skill suggestions, LinkedIn
  headline generator, interview question generator. Suggestions are always
  shown for review and only applied when you approve them. Nothing is sent
  to any server; nothing is invented about you.
- **PDF export** — the live document prints to a real PDF via the browser
  (A4 by default, US Letter optional). Selectable text, clickable links,
  multi-page. This is not a screenshot: it is the actual document DOM.
- **Dashboard** — all CVs and cover letters, with Edit / PDF / Duplicate /
  Rename / Delete, stats, recent activity, a **job applications tracker**,
  account settings.
- **Cover letter builder** — three styles (Classic / Modern / Bold) matching
  your CV template, live preview, PDF.
- **Autosave** — every change saves to localStorage (debounced) with a
  Saving / Saved indicator; refresh the page and your CV is still there.
- **Admin panel** — stats from local data, template management (activate /
  featured / premium toggles that apply to the gallery immediately), website
  settings (brand name + accent, applied live).

## What is honest, not finished

This build is a **client-side demo** — there is no server yet. The following
are deliberately local and labelled as such in the UI:

- **Auth is a demo account** stored in localStorage on this device. It is not
  real server authentication. Google sign-in is not connected.
- **Admin user management is not available** — with no server there are no
  other users to manage.
- **AI features are on-device helpers**, not a live AI model. No personal CV
  data is ever sent anywhere.
- **Premium templates are unlocked** in this build. The data model has
  Free/Premium flags and the admin can toggle them; the paywall needs a
  payment provider (see below).
- **Payments are not connected.** No checkout, no fake payment success.

## Run it

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploy (GitHub Pages)

Settings → Pages → Deploy from a branch → `main`, `/ (root)`.
Live at `https://<your-username>.github.io/cvora-resume-studio/`.

## Next steps (real backend / AI / payments)

To turn this into the full product described in the brief:

1. **Backend — Supabase** (recommended)
   - Create a project at https://supabase.com, then set:
     - `VITE_SUPABASE_URL` — your project URL
     - `VITE_SUPABASE_ANON_KEY` — your publishable key
   - Tables: profiles, resumes (JSONB content), cover_letters, templates,
     favorites, subscriptions, ai_usage, activity_logs — with row-level
     security so a user can only read/write their own rows.
   - Replace the localStorage store in `js/store.js` with Supabase calls and
     real auth (email + Google OAuth via Supabase Auth).
2. **AI — any provider**
   - `OPENAI_API_KEY` (or Anthropic `ANTHROPIC_API_KEY`) on the server only —
     never in frontend code. The on-device helpers in `js/editor.js`
     (`generateSummary`, `improveBullet`, `suggestSkills`, `grammarCheck`)
     are the exact integration points: replace them with server calls that
     return suggestions for the user to approve.
3. **Payments — Stripe**
   - `STRIPE_SECRET_KEY` (server) + `STRIPE_PUBLISHABLE_KEY` (client).
     Gate premium templates by subscription status; the premium flags already
     exist in the data model.

## Project structure

```
cvora-resume-studio/
  index.html            — landing, gallery, editor, dashboard, cover, admin
  css/style.css         — app chrome, landing, editor, print
  css/templates.css     — the CV document: 100 configs, one renderer
  js/templates.js       — all 100 template definitions
  js/store.js           — local data: resumes, letters, demo auth, admin flags
  js/render.js          — CV renderer (preview, thumbnails, print)
  js/editor.js          — wizard, design, sections, ATS, writing helpers
  js/import.js          — CV upload & import (PDF/DOCX/TXT/paste → editable CV)
  js/export.js          — PDF/PNG/JPG/DOC/TXT/HTML/JSON export
  js/app.js             — views, gallery, dashboard, cover letters, admin
```

## License

MIT — see [LICENSE](LICENSE).
