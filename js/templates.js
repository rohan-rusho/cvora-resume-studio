/* CVora template library — 100 genuinely different templates.
   Each template is a distinct combination of layout, header, font, accent,
   skill style, divider, photo treatment and heading style. The renderer in
   render.js turns these configs into real CV documents. */
(function () {
  "use strict";

  /* layout: single | two-col | side-l | side-r | banner
     header: left | center | split | banner
     font: inter | jakarta | manrope | serif | mono
     skill: text | bars | dots | chips
     divider: line | accent | none | double
     photo: none | round | square
     heading: upper | accent | plain | boxed */
  var TEMPLATES = [
    /* ---------- A. Professional (8) ---------- */
    { id: "executive-classic", name: "Executive Classic", cat: "Professional", desc: "Timeless serif single-column for senior leaders.", ats: true, premium: false, layout: "single", header: "center", font: "serif", accent: "#1e3a5f", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "corporate-elite", name: "Corporate Elite", cat: "Professional", desc: "Navy banner header, crisp two-column body.", ats: true, premium: true, layout: "banner", header: "banner", font: "jakarta", accent: "#172554", skill: "text", divider: "line", photo: "none", heading: "upper" },
    { id: "professional-edge", name: "Professional Edge", cat: "Professional", desc: "Sharp left header with an accent rule.", ats: true, premium: false, layout: "single", header: "left", font: "inter", accent: "#0f766e", skill: "bars", divider: "accent", photo: "none", heading: "accent" },
    { id: "business-standard", name: "Business Standard", cat: "Professional", desc: "The safe, clean standard every recruiter knows.", ats: true, premium: false, layout: "single", header: "split", font: "inter", accent: "#334155", skill: "text", divider: "line", photo: "none", heading: "upper" },
    { id: "career-pro", name: "Career Pro", cat: "Professional", desc: "Two-column with a quiet skills rail on the right.", ats: true, premium: false, layout: "two-col", header: "left", font: "jakarta", accent: "#1d4ed8", skill: "dots", divider: "line", photo: "round", heading: "upper" },
    { id: "modern-executive", name: "Modern Executive", cat: "Professional", desc: "Modern sans, sidebar contact block, bold name.", ats: false, premium: true, layout: "side-l", header: "left", font: "jakarta", accent: "#111827", skill: "bars", divider: "none", photo: "square", heading: "accent" },
    { id: "corporate-minimal", name: "Corporate Minimal", cat: "Professional", desc: "Almost bare — type and whitespace do the work.", ats: true, premium: false, layout: "single", header: "center", font: "manrope", accent: "#475569", skill: "text", divider: "none", photo: "none", heading: "plain" },
    { id: "leadership-profile", name: "Leadership Profile", cat: "Professional", desc: "Sidebar leadership summary with timeline roles.", ats: false, premium: true, layout: "side-r", header: "left", font: "serif", accent: "#7c2d12", skill: "text", divider: "accent", photo: "round", heading: "upper" },

    /* ---------- B. Modern (8) ---------- */
    { id: "modern-horizon", name: "Modern Horizon", cat: "Modern", desc: "Wide banner, violet accent, airy sections.", ats: false, premium: false, layout: "banner", header: "banner", font: "jakarta", accent: "#7c3aed", skill: "chips", divider: "none", photo: "none", heading: "accent" },
    { id: "urban-professional", name: "Urban Professional", cat: "Modern", desc: "City-sharp split header, blue accent.", ats: true, premium: false, layout: "single", header: "split", font: "inter", accent: "#0369a1", skill: "bars", divider: "line", photo: "none", heading: "upper" },
    { id: "nextgen-resume", name: "NextGen Resume", cat: "Modern", desc: "Two-column, mono details, electric blue.", ats: false, premium: true, layout: "two-col", header: "left", font: "mono", accent: "#2563eb", skill: "dots", divider: "accent", photo: "none", heading: "accent" },
    { id: "modern-split", name: "Modern Split", cat: "Modern", desc: "Name left, contact right, amber rule.", ats: true, premium: false, layout: "single", header: "split", font: "manrope", accent: "#b45309", skill: "text", divider: "accent", photo: "none", heading: "upper" },
    { id: "contemporary-pro", name: "Contemporary Pro", cat: "Modern", desc: "Soft gray sidebar, teal accents.", ats: false, premium: false, layout: "side-l", header: "left", font: "inter", accent: "#0d9488", skill: "chips", divider: "none", photo: "round", heading: "plain" },
    { id: "bold-identity", name: "Bold Identity", cat: "Modern", desc: "Oversized name, heavy rules, confident.", ats: false, premium: true, layout: "single", header: "left", font: "jakarta", accent: "#be123c", skill: "bars", divider: "double", photo: "none", heading: "boxed" },
    { id: "modern-timeline", name: "Modern Timeline", cat: "Modern", desc: "Experience as a vertical timeline.", ats: true, premium: false, layout: "single", header: "center", font: "inter", accent: "#4f46e5", skill: "text", divider: "line", photo: "none", heading: "accent" },
    { id: "dynamic-career", name: "Dynamic Career", cat: "Modern", desc: "Right sidebar for skills, green accent.", ats: false, premium: false, layout: "side-r", header: "left", font: "manrope", accent: "#15803d", skill: "dots", divider: "none", photo: "square", heading: "upper" },

    /* ---------- C. Minimalist (7) ---------- */
    { id: "pure-minimal", name: "Pure Minimal", cat: "Minimalist", desc: "Nothing but type, space and one thin rule.", ats: true, premium: false, layout: "single", header: "left", font: "inter", accent: "#18181b", skill: "text", divider: "none", photo: "none", heading: "plain" },
    { id: "clean-slate", name: "Clean Slate", cat: "Minimalist", desc: "Centered name, generous margins.", ats: true, premium: false, layout: "single", header: "center", font: "manrope", accent: "#3f3f46", skill: "text", divider: "line", photo: "none", heading: "upper" },
    { id: "elegant-white", name: "Elegant White", cat: "Minimalist", desc: "Serif headings, wide leading, quiet luxury.", ats: true, premium: true, layout: "single", header: "center", font: "serif", accent: "#44403c", skill: "text", divider: "none", photo: "none", heading: "plain" },
    { id: "simple-structure", name: "Simple Structure", cat: "Minimalist", desc: "Left-aligned, tabular dates, no decoration.", ats: true, premium: false, layout: "single", header: "left", font: "inter", accent: "#52525b", skill: "text", divider: "line", photo: "none", heading: "upper" },
    { id: "typography-first", name: "Typography First", cat: "Minimalist", desc: "Type scale is the whole design.", ats: true, premium: false, layout: "single", header: "left", font: "jakarta", accent: "#0f172a", skill: "text", divider: "none", photo: "none", heading: "boxed" },
    { id: "minimal-grid", name: "Minimal Grid", cat: "Minimalist", desc: "Two quiet columns, hairline dividers.", ats: true, premium: false, layout: "two-col", header: "split", font: "inter", accent: "#57534e", skill: "text", divider: "line", photo: "none", heading: "upper" },
    { id: "essential-cv", name: "Essential CV", cat: "Minimalist", desc: "Only the essentials, perfectly spaced.", ats: true, premium: false, layout: "single", header: "center", font: "manrope", accent: "#1c1917", skill: "text", divider: "none", photo: "none", heading: "plain" },

    /* ---------- D. Creative (7) ---------- */
    { id: "creative-portfolio", name: "Creative Portfolio", cat: "Creative", desc: "Bold color block header, portfolio-first.", ats: false, premium: true, layout: "banner", header: "banner", font: "jakarta", accent: "#db2777", skill: "chips", divider: "none", photo: "round", heading: "accent" },
    { id: "artistic-profile", name: "Artistic Profile", cat: "Creative", desc: "Warm accent, round photo, expressive type.", ats: false, premium: false, layout: "side-l", header: "left", font: "manrope", accent: "#c2410c", skill: "bars", divider: "accent", photo: "round", heading: "accent" },
    { id: "designer-identity", name: "Designer Identity", cat: "Creative", desc: "Black header band, white type, grid skills.", ats: false, premium: true, layout: "banner", header: "banner", font: "inter", accent: "#111111", skill: "chips", divider: "double", photo: "square", heading: "boxed" },
    { id: "visual-impact", name: "Visual Impact", cat: "Creative", desc: "Big color moments, confident hierarchy.", ats: false, premium: false, layout: "single", header: "left", font: "jakarta", accent: "#7e22ce", skill: "dots", divider: "accent", photo: "none", heading: "accent" },
    { id: "creative-studio", name: "Creative Studio", cat: "Creative", desc: "Studio-style sidebar with project focus.", ats: false, premium: false, layout: "side-r", header: "left", font: "manrope", accent: "#0e7490", skill: "chips", divider: "none", photo: "round", heading: "plain" },
    { id: "color-accent", name: "Color Accent", cat: "Creative", desc: "One vivid accent carries the whole page.", ats: true, premium: false, layout: "single", header: "split", font: "inter", accent: "#e11d48", skill: "text", divider: "accent", photo: "none", heading: "upper" },
    { id: "portfolio-pro", name: "Portfolio Pro", cat: "Creative", desc: "Projects up front, work samples led.", ats: false, premium: true, layout: "two-col", header: "center", font: "jakarta", accent: "#4338ca", skill: "bars", divider: "line", photo: "square", heading: "accent" },

    /* ---------- E. Technology (6) ---------- */
    { id: "developer-pro", name: "Developer Pro", cat: "Technology", desc: "Mono type, terminal-inspired details.", ats: true, premium: false, layout: "single", header: "left", font: "mono", accent: "#16a34a", skill: "bars", divider: "line", photo: "none", heading: "accent" },
    { id: "tech-stack", name: "Tech Stack", cat: "Technology", desc: "Stack chips, two-column, blue-gray.", ats: true, premium: false, layout: "two-col", header: "split", font: "mono", accent: "#0284c7", skill: "chips", divider: "accent", photo: "none", heading: "upper" },
    { id: "software-engineer", name: "Software Engineer", cat: "Technology", desc: "Clean engineering layout, sidebar skills.", ats: true, premium: true, layout: "side-l", header: "left", font: "inter", accent: "#1e40af", skill: "dots", divider: "line", photo: "none", heading: "upper" },
    { id: "data-specialist", name: "Data Specialist", cat: "Technology", desc: "Data-first, metric-led bullets, teal.", ats: true, premium: false, layout: "single", header: "left", font: "jakarta", accent: "#0f766e", skill: "bars", divider: "accent", photo: "none", heading: "accent" },
    { id: "it-professional", name: "IT Professional", cat: "Technology", desc: "Structured, certification-forward.", ats: true, premium: false, layout: "single", header: "split", font: "inter", accent: "#334155", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "engineering-elite", name: "Engineering Elite", cat: "Technology", desc: "Dark sidebar, engineering precision.", ats: false, premium: true, layout: "side-l", header: "left", font: "mono", accent: "#0f172a", skill: "bars", divider: "none", photo: "none", heading: "boxed" },

    /* ---------- F. Student / Fresh Graduate (5) ---------- */
    { id: "fresh-graduate", name: "Fresh Graduate", cat: "Student", desc: "Education first, friendly and bright.", ats: true, premium: false, layout: "single", header: "center", font: "manrope", accent: "#2563eb", skill: "chips", divider: "accent", photo: "round", heading: "accent" },
    { id: "student-starter", name: "Student Starter", cat: "Student", desc: "Simple, warm, built for a first CV.", ats: true, premium: false, layout: "single", header: "left", font: "inter", accent: "#059669", skill: "text", divider: "line", photo: "none", heading: "upper" },
    { id: "academic-journey", name: "Academic Journey", cat: "Student", desc: "Coursework and projects take the lead.", ats: true, premium: false, layout: "two-col", header: "center", font: "jakarta", accent: "#7c3aed", skill: "dots", divider: "line", photo: "none", heading: "accent" },
    { id: "first-opportunity", name: "First Opportunity", cat: "Student", desc: "Bold header, internship-ready.", ats: false, premium: false, layout: "banner", header: "banner", font: "manrope", accent: "#ea580c", skill: "chips", divider: "none", photo: "none", heading: "plain" },
    { id: "graduate-pro", name: "Graduate Pro", cat: "Student", desc: "Polished graduate look, navy + gold.", ats: true, premium: true, layout: "side-r", header: "left", font: "serif", accent: "#92400e", skill: "bars", divider: "accent", photo: "round", heading: "upper" },

    /* ---------- G. Academic (4) ---------- */
    { id: "research-scholar", name: "Research Scholar", cat: "Academic", desc: "Publications-led, classic serif.", ats: true, premium: false, layout: "single", header: "center", font: "serif", accent: "#1e3a5f", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "academic-classic", name: "Academic Classic", cat: "Academic", desc: "The traditional academic CV, refined.", ats: true, premium: false, layout: "single", header: "left", font: "serif", accent: "#292524", skill: "text", divider: "line", photo: "none", heading: "plain" },
    { id: "university-profile", name: "University Profile", cat: "Academic", desc: "Teaching and research in balance.", ats: true, premium: true, layout: "two-col", header: "split", font: "jakarta", accent: "#3730a3", skill: "text", divider: "accent", photo: "none", heading: "upper" },
    { id: "research-professional", name: "Research Professional", cat: "Academic", desc: "Grants, papers, talks — structured.", ats: true, premium: false, layout: "single", header: "left", font: "inter", accent: "#155e75", skill: "bars", divider: "line", photo: "none", heading: "accent" },

    /* ---------- H. Specialized (5) ---------- */
    { id: "healthcare-professional", name: "Healthcare Professional", cat: "Specialized", desc: "Calm teal, credentials up front.", ats: true, premium: false, layout: "single", header: "left", font: "inter", accent: "#0f766e", skill: "text", divider: "accent", photo: "round", heading: "upper" },
    { id: "finance-executive", name: "Finance Executive", cat: "Specialized", desc: "Deep green, numbers-led, precise.", ats: true, premium: true, layout: "side-l", header: "left", font: "serif", accent: "#14532d", skill: "bars", divider: "double", photo: "none", heading: "upper" },
    { id: "marketing-specialist", name: "Marketing Specialist", cat: "Specialized", desc: "Vibrant, campaign-led, bold type.", ats: false, premium: false, layout: "banner", header: "banner", font: "jakarta", accent: "#c026d3", skill: "chips", divider: "none", photo: "square", heading: "accent" },
    { id: "project-manager", name: "Project Manager", cat: "Specialized", desc: "Delivery-focused, timeline structure.", ats: true, premium: false, layout: "two-col", header: "split", font: "inter", accent: "#9a3412", skill: "dots", divider: "line", photo: "none", heading: "upper" },
    { id: "international-resume", name: "International Resume", cat: "Specialized", desc: "Photo, languages and global experience.", ats: false, premium: true, layout: "side-r", header: "left", font: "manrope", accent: "#1d4ed8", skill: "text", divider: "accent", photo: "round", heading: "plain" },

    /* ---------- I. Premium designs (5) ---------- */
    { id: "nordic-elegance", name: "Nordic Elegance", cat: "Premium", desc: "Scandinavian calm, pale accent, space.", ats: true, premium: true, layout: "single", header: "center", font: "manrope", accent: "#64748b", skill: "text", divider: "none", photo: "none", heading: "plain" },
    { id: "swiss-precision", name: "Swiss Precision", cat: "Premium", desc: "Grid-driven, red accent, exact.", ats: true, premium: true, layout: "two-col", header: "split", font: "inter", accent: "#dc2626", skill: "text", divider: "line", photo: "none", heading: "boxed" },
    { id: "editorial-classic", name: "Editorial Classic", cat: "Premium", desc: "Magazine typography, editorial rules.", ats: false, premium: true, layout: "single", header: "center", font: "serif", accent: "#111827", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "premium-sidebar", name: "Premium Sidebar", cat: "Premium", desc: "Dark sidebar, gold accents, luxe.", ats: false, premium: true, layout: "side-l", header: "left", font: "jakarta", accent: "#a16207", skill: "bars", divider: "none", photo: "round", heading: "accent" },
    { id: "monochrome-executive", name: "Monochrome Executive", cat: "Premium", desc: "Black and white only, total restraint.", ats: true, premium: true, layout: "single", header: "left", font: "inter", accent: "#000000", skill: "text", divider: "double", photo: "none", heading: "boxed" },

    /* ---------- J. Executive (5) ---------- */
    { id: "boardroom-leader", name: "Boardroom Leader", cat: "Executive", desc: "C-suite gravitas — serif, gold rule, quiet authority.", ats: true, premium: true, layout: "single", header: "center", font: "playfair", accent: "#92400e", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "c-suite-profile", name: "C-Suite Profile", cat: "Executive", desc: "Board-ready profile with impact metrics up front.", ats: true, premium: true, layout: "banner", header: "banner", font: "jakarta", accent: "#1e3a5f", skill: "bars", divider: "line", photo: "round", heading: "upper" },
    { id: "chairman-classic", name: "Chairman Classic", cat: "Executive", desc: "Traditional top-level CV, navy serif, double rules.", ats: true, premium: false, layout: "single", header: "left", font: "serif", accent: "#172554", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "director-brief", name: "Director Brief", cat: "Executive", desc: "One-page director summary, sidebar achievements.", ats: true, premium: false, layout: "side-r", header: "left", font: "montserrat", accent: "#0f766e", skill: "dots", divider: "accent", photo: "square", heading: "accent" },
    { id: "vp-leadership", name: "VP Leadership", cat: "Executive", desc: "VP-grade two-column with a leadership rail.", ats: false, premium: true, layout: "two-col", header: "split", font: "inter", accent: "#7c2d12", skill: "bars", divider: "line", photo: "none", heading: "boxed" },

    /* ---------- K. Healthcare (5) ---------- */
    { id: "nurse-professional", name: "Nurse Professional", cat: "Healthcare", desc: "Calm clinical teal, certifications first.", ats: true, premium: false, layout: "single", header: "left", font: "inter", accent: "#0e7490", skill: "text", divider: "accent", photo: "round", heading: "upper" },
    { id: "physician-profile", name: "Physician Profile", cat: "Healthcare", desc: "Clinical, precise, publications and training led.", ats: true, premium: true, layout: "single", header: "center", font: "serif", accent: "#155e75", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "pharmacist-career", name: "Pharmacist Career", cat: "Healthcare", desc: "Clean two-column with a credentials rail.", ats: true, premium: false, layout: "two-col", header: "split", font: "jakarta", accent: "#166534", skill: "dots", divider: "line", photo: "none", heading: "accent" },
    { id: "therapist-warm", name: "Therapist Warm", cat: "Healthcare", desc: "Warm, human, soft accent — care-first design.", ats: true, premium: false, layout: "single", header: "center", font: "manrope", accent: "#9d174d", skill: "chips", divider: "none", photo: "round", heading: "plain" },
    { id: "medical-admin", name: "Medical Admin", cat: "Healthcare", desc: "Structured admin layout, sidebar skills.", ats: true, premium: false, layout: "side-l", header: "left", font: "roboto", accent: "#1d4ed8", skill: "bars", divider: "line", photo: "none", heading: "upper" },

    /* ---------- L. Legal (5) ---------- */
    { id: "attorney-classic", name: "Attorney Classic", cat: "Legal", desc: "Formal serif, bar admissions up front.", ats: true, premium: true, layout: "single", header: "center", font: "serif", accent: "#1c1917", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "paralegal-pro", name: "Paralegal Pro", cat: "Legal", desc: "Precise, matter-led, tabular dates.", ats: true, premium: false, layout: "single", header: "left", font: "inter", accent: "#334155", skill: "text", divider: "line", photo: "none", heading: "plain" },
    { id: "counsel-modern", name: "Counsel Modern", cat: "Legal", desc: "Modern in-house counsel, navy sidebar.", ats: false, premium: true, layout: "side-l", header: "left", font: "jakarta", accent: "#172554", skill: "bars", divider: "none", photo: "square", heading: "accent" },
    { id: "law-graduate", name: "Law Graduate", cat: "Legal", desc: "Education and moots first, bright and clean.", ats: true, premium: false, layout: "two-col", header: "center", font: "manrope", accent: "#7c3aed", skill: "chips", divider: "accent", photo: "none", heading: "accent" },
    { id: "legal-assistant", name: "Legal Assistant", cat: "Legal", desc: "Support-role CV, skills chips, warm gray.", ats: true, premium: false, layout: "single", header: "split", font: "lato", accent: "#57534e", skill: "chips", divider: "line", photo: "round", heading: "upper" },

    /* ---------- M. Engineering (5) ---------- */
    { id: "civil-engineer", name: "Civil Engineer", cat: "Engineering", desc: "Project-led, site experience first, slate blue.", ats: true, premium: false, layout: "single", header: "left", font: "inter", accent: "#0369a1", skill: "bars", divider: "accent", photo: "none", heading: "upper" },
    { id: "mechanical-engineer", name: "Mechanical Engineer", cat: "Engineering", desc: "Technical, metric-led, mono details.", ats: true, premium: false, layout: "two-col", header: "split", font: "mono", accent: "#374151", skill: "dots", divider: "line", photo: "none", heading: "accent" },
    { id: "electrical-engineer", name: "Electrical Engineer", cat: "Engineering", desc: "Amber accent, systems and circuits focus.", ats: true, premium: false, layout: "single", header: "center", font: "jakarta", accent: "#b45309", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "qa-engineer", name: "QA Engineer", cat: "Engineering", desc: "Quality-first, testing tools in a sidebar.", ats: true, premium: false, layout: "side-r", header: "left", font: "roboto", accent: "#15803d", skill: "chips", divider: "none", photo: "none", heading: "plain" },
    { id: "engineering-manager", name: "Engineering Manager", cat: "Engineering", desc: "Team and delivery led, dark sidebar.", ats: false, premium: true, layout: "side-l", header: "banner", font: "montserrat", accent: "#0f172a", skill: "bars", divider: "none", photo: "round", heading: "boxed" },

    /* ---------- N. Sales (5) ---------- */
    { id: "sales-manager", name: "Sales Manager", cat: "Sales", desc: "Quota-busting numbers up front, bold red accent.", ats: true, premium: false, layout: "banner", header: "banner", font: "poppins", accent: "#b91c1c", skill: "bars", divider: "none", photo: "none", heading: "accent" },
    { id: "account-executive", name: "Account Executive", cat: "Sales", desc: "Deal-led, client wins first, navy + gold.", ats: true, premium: true, layout: "single", header: "split", font: "jakarta", accent: "#92400e", skill: "dots", divider: "accent", photo: "round", heading: "upper" },
    { id: "business-developer", name: "Business Developer", cat: "Sales", desc: "Growth-focused, pipeline metrics, green.", ats: true, premium: false, layout: "two-col", header: "left", font: "inter", accent: "#166534", skill: "text", divider: "line", photo: "none", heading: "accent" },
    { id: "sales-representative", name: "Sales Representative", cat: "Sales", desc: "Field sales, territory wins, bright and direct.", ats: true, premium: false, layout: "single", header: "center", font: "manrope", accent: "#ea580c", skill: "chips", divider: "accent", photo: "none", heading: "plain" },
    { id: "retail-manager", name: "Retail Manager", cat: "Sales", desc: "Store leadership, team size and sales led.", ats: true, premium: false, layout: "side-l", header: "left", font: "lato", accent: "#9d174d", skill: "bars", divider: "line", photo: "square", heading: "upper" },

    /* ---------- O. Finance (5) ---------- */
    { id: "accountant-pro", name: "Accountant Pro", cat: "Finance", desc: "Ledger-clean, qualifications first, forest green.", ats: true, premium: false, layout: "single", header: "left", font: "inter", accent: "#14532d", skill: "text", divider: "line", photo: "none", heading: "upper" },
    { id: "financial-analyst", name: "Financial Analyst", cat: "Finance", desc: "Models and metrics led, two-column, steel blue.", ats: true, premium: false, layout: "two-col", header: "split", font: "jakarta", accent: "#1e40af", skill: "bars", divider: "accent", photo: "none", heading: "accent" },
    { id: "auditor-precise", name: "Auditor Precise", cat: "Finance", desc: "Exact, tabular, double rules, serif headings.", ats: true, premium: true, layout: "single", header: "center", font: "serif", accent: "#292524", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "banker-profile", name: "Banker Profile", cat: "Finance", desc: "Private banking polish, sidebar credentials.", ats: false, premium: true, layout: "side-r", header: "left", font: "playfair", accent: "#172554", skill: "dots", divider: "none", photo: "round", heading: "boxed" },
    { id: "tax-specialist", name: "Tax Specialist", cat: "Finance", desc: "Compliance-led, clean single column, slate.", ats: true, premium: false, layout: "single", header: "split", font: "opensans", accent: "#475569", skill: "text", divider: "line", photo: "none", heading: "plain" },

    /* ---------- P. Education (5) ---------- */
    { id: "teacher-classic", name: "Teacher Classic", cat: "Education", desc: "Warm, classroom-led, friendly teal.", ats: true, premium: false, layout: "single", header: "center", font: "manrope", accent: "#0d9488", skill: "chips", divider: "accent", photo: "round", heading: "accent" },
    { id: "lecturer-academic", name: "Lecturer Academic", cat: "Education", desc: "Teaching and research in balance, serif.", ats: true, premium: false, layout: "single", header: "left", font: "serif", accent: "#3730a3", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "trainer-corporate", name: "Corporate Trainer", cat: "Education", desc: "Workshops and outcomes led, amber accent.", ats: true, premium: false, layout: "banner", header: "banner", font: "poppins", accent: "#b45309", skill: "bars", divider: "none", photo: "none", heading: "accent" },
    { id: "professor-scholar", name: "Professor Scholar", cat: "Education", desc: "Publications-led, classic academic weight.", ats: true, premium: true, layout: "single", header: "center", font: "playfair", accent: "#1e3a5f", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "tutor-friendly", name: "Tutor Friendly", cat: "Education", desc: "Subjects and results first, bright and warm.", ats: true, premium: false, layout: "two-col", header: "left", font: "lato", accent: "#db2777", skill: "dots", divider: "line", photo: "round", heading: "plain" },

    /* ---------- Q. Hospitality (5) ---------- */
    { id: "chef-culinary", name: "Chef Culinary", cat: "Hospitality", desc: "Kitchen-led, cuisine specialties, warm charcoal.", ats: true, premium: false, layout: "single", header: "left", font: "manrope", accent: "#7c2d12", skill: "chips", divider: "accent", photo: "round", heading: "accent" },
    { id: "hotel-manager", name: "Hotel Manager", cat: "Hospitality", desc: "Guest experience led, elegant sidebar.", ats: false, premium: true, layout: "side-l", header: "banner", font: "playfair", accent: "#78350f", skill: "bars", divider: "none", photo: "square", heading: "boxed" },
    { id: "event-coordinator", name: "Event Coordinator", cat: "Hospitality", desc: "Events and logistics first, vibrant violet.", ats: true, premium: false, layout: "banner", header: "banner", font: "jakarta", accent: "#6d28d9", skill: "chips", divider: "none", photo: "none", heading: "accent" },
    { id: "travel-agent", name: "Travel Agent", cat: "Hospitality", desc: "Destinations and languages led, sky blue.", ats: true, premium: false, layout: "two-col", header: "split", font: "inter", accent: "#0284c7", skill: "text", divider: "line", photo: "none", heading: "upper" },
    { id: "customer-service-pro", name: "Customer Service Pro", cat: "Hospitality", desc: "Service metrics led, friendly green.", ats: true, premium: false, layout: "single", header: "center", font: "opensans", accent: "#15803d", skill: "dots", divider: "accent", photo: "round", heading: "plain" },

    /* ---------- R. Freelance (5) ---------- */
    { id: "freelancer-flex", name: "Freelancer Flex", cat: "Freelance", desc: "Clients and projects first, modern and open.", ats: true, premium: false, layout: "single", header: "left", font: "jakarta", accent: "#0891b2", skill: "chips", divider: "accent", photo: "round", heading: "accent" },
    { id: "consultant-strategy", name: "Strategy Consultant", cat: "Freelance", desc: "Engagements led, sharp navy, serif name.", ats: true, premium: true, layout: "single", header: "split", font: "serif", accent: "#1e3a5f", skill: "text", divider: "double", photo: "none", heading: "upper" },
    { id: "contractor-skilled", name: "Skilled Contractor", cat: "Freelance", desc: "Tickets and trades first, practical and bold.", ats: true, premium: false, layout: "two-col", header: "left", font: "roboto", accent: "#9a3412", skill: "bars", divider: "line", photo: "none", heading: "upper" },
    { id: "remote-worker", name: "Remote Worker", cat: "Freelance", desc: "Distributed teams, tools and time zones.", ats: true, premium: false, layout: "side-r", header: "left", font: "mono", accent: "#0f766e", skill: "dots", divider: "none", photo: "none", heading: "plain" },
    { id: "creative-freelancer", name: "Creative Freelancer", cat: "Freelance", desc: "Portfolio-first, bold color, big name.", ats: false, premium: true, layout: "banner", header: "banner", font: "montserrat", accent: "#be123c", skill: "chips", divider: "none", photo: "square", heading: "boxed" }
  ];

  var CATEGORIES = ["All", "Professional", "Modern", "Minimalist", "Creative", "Technology", "Student", "Academic", "Specialized", "Premium", "Executive", "Healthcare", "Legal", "Engineering", "Sales", "Finance", "Education", "Hospitality", "Freelance"];

  window.CVORA_TEMPLATES = TEMPLATES;
  window.CVORA_CATEGORIES = CATEGORIES;
})();
