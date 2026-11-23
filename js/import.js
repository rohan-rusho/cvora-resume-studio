/* CVora import — upload an existing CV and turn it into an editable CVora
   resume. The uploaded text REPLACES the current CV's content (template and
   design are kept) or creates a brand-new CV — the user's choice.
   Sources:
   - .txt / .md / pasted text: read directly, works fully offline.
   - .pdf: parsed with pdf.js, loaded on demand from a CDN.
   - .docx: parsed with mammoth.js, loaded on demand from a CDN.
   - .json: a CVora resume export, handled by CvoraExport.importJsonFile.
   If the CDN libraries cannot load (offline), the user is told to paste the
   text instead — TXT and paste always work. Nothing is uploaded to a server:
   the file is read in the browser and the libraries run locally. */
(function () {
  "use strict";

  var PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  var PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  var MAMMOTH_URL = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";

  var uidCounter = 0;
  function uid(p) {
    uidCounter++;
    return p + "-" + Date.now().toString(36) + "-" + uidCounter + "-" + Math.floor(Math.random() * 1e6).toString(36);
  }
  function now() { return new Date().toISOString(); }

  /* Minimal blank resume used only when CvoraStore is not loaded (Node tests).
     In the browser the real CvoraBlankResume() is used instead. */
  function makeBlank() {
    return {
      id: uid("cv"), title: "Untitled CV", templateId: "executive-classic",
      createdAt: now(), updatedAt: now(),
      design: { accent: "", font: "", layout: "", header: "", skill: "", heading: "", divider: "", photo: "", sidebar: "", bg: "", nameSize: 28, bodySize: 11, lineHeight: 1.5, margin: 18, spacing: 10, pageSize: "A4" },
      hiddenSections: [],
      sectionOrder: ["summary", "experience", "education", "skills", "projects", "certifications", "languages", "custom"],
      personal: { fullName: "", title: "", email: "", phone: "", country: "", city: "", address: "", linkedin: "", portfolio: "", website: "", github: "", photo: "", show: { email: true, phone: true, linkedin: true, portfolio: true, website: true, github: true, address: false } },
      summary: "", objective: "", yearsExp: "", industry: "", currentRole: "",
      experience: [], education: [], skills: [], projects: [], certifications: [], languages: [], customSections: []
    };
  }
  function blankResume() {
    if (typeof window !== "undefined" && window.CvoraBlankResume) return window.CvoraBlankResume();
    return makeBlank();
  }

  /* ---------------- text helpers ---------------- */
  function linesOf(text) {
    return String(text || "").replace(/\r\n?/g, "\n").split("\n")
      .map(function (l) { return l.replace(/[ \t]+/g, " ").trim(); });
  }
  function isJunk(line) {
    return /^(page \d+(\s+of\s+\d+)?|curriculum vitae|resume|cv|references available( on request)?)$/i.test(line);
  }
  function cleanLine(line) {
    return line.replace(/^[\s•·\-*▸►○]+/, "").replace(/[\s•·]+$/, "").trim();
  }

  /* ---------------- section headers ---------------- */
  var SECTION_HEADS = [
    { key: "contact", re: /^(contact|contact information|personal information|personal details)$/i },
    { key: "summary", re: /^(professional summary|summary|profile|about me|about|career summary|career objective|objective)$/i },
    { key: "experience", re: /^(work experience|professional experience|experience|employment|employment history|work history|career history|relevant experience)$/i },
    { key: "education", re: /^(education|academic background|academic qualifications|qualifications|education & training)$/i },
    { key: "skills", re: /^(skills|technical skills|core skills|key skills|skills & expertise|skills and expertise|competencies|core competencies)$/i },
    { key: "projects", re: /^(projects|selected projects|personal projects|portfolio|key projects|notable projects)$/i },
    { key: "certifications", re: /^(certifications|certificates|licenses|licenses & certifications|certifications & courses|training)$/i },
    { key: "languages", re: /^(languages|languages spoken)$/i },
    { key: "awards", re: /^(awards|achievements|honors|honours|accomplishments)$/i }
  ];
  function sectionKey(line) {
    var clean = line.replace(/[:\s]+$/, "").replace(/^#+\s*/, "");
    for (var i = 0; i < SECTION_HEADS.length; i++) {
      if (SECTION_HEADS[i].re.test(clean)) return SECTION_HEADS[i].key;
    }
    return null;
  }

  /* ---------------- dates ---------------- */
  var MONTH_NUM = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
  /* non-capturing month alternation — groups stay: 1=start month, 2=start year, 3=end month, 4=end year/Present */
  var MONTH_RE = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?";
  var DATE_RANGE_RE = new RegExp("(?:(" + MONTH_RE + ")\\s+)?(\\d{4})\\s*(?:–|—|-|to)\\s*(?:(" + MONTH_RE + ")\\s+)?(\\d{4}|Present|Current|Now|Till date|Ongoing)", "i");
  function ym(monthWord, year) {
    if (!year) return "";
    var m = monthWord ? MONTH_NUM[String(monthWord).toLowerCase().replace(".", "")] : 0;
    return m ? year + "-" + (m < 10 ? "0" + m : m) : year;
  }
  function parseDateRange(line) {
    var m = line.match(DATE_RANGE_RE);
    if (!m) return null;
    var start = ym(m[1], m[2]);
    var endRaw = m[4] || "";
    var current = /present|current|now|till|ongoing/i.test(endRaw);
    var end = current ? "" : ym(m[3], /^\d{4}$/.test(endRaw) ? endRaw : "");
    return { start: start, end: end, current: current, matched: m[0] };
  }

  /* ---------------- contact extraction ---------------- */
  var EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  var PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
  function digits(s) { return (s || "").replace(/\D/g, ""); }
  function extractContacts(lines) {
    var out = { email: "", phone: "", linkedin: "", portfolio: "", website: "", github: "", city: "", country: "" };
    lines.forEach(function (line, idx) {
      var em = line.match(EMAIL_RE);
      if (em && !out.email) out.email = em[0];
      var ph = line.match(PHONE_RE);
      if (ph && !out.phone && digits(ph[0]).length >= 9 && digits(ph[0]).length <= 15) out.phone = ph[0].trim();
      /* pull the URL out of the line — contact details often share one line
         separated by | or commas, so the whole line is never the value */
      var li = line.match(/linkedin\.com\/[A-Za-z0-9._\-/]+/i);
      if (li && !out.linkedin) out.linkedin = li[0];
      var gh = line.match(/github\.com\/[A-Za-z0-9._\-/]+/i);
      if (gh && !out.github) out.github = gh[0];
      var ws = line.match(/(?:https?:\/\/|www\.)[^\s|,;]+/i);
      if (ws && !out.website && !/linkedin|github/i.test(ws[0])) out.website = ws[0];
      /* city: only from the top of the document, short, no role words —
         so a job line like "Senior Designer, FinEdge Ltd." is never a city */
      if (!out.city && idx < 10 && /^[A-Z][A-Za-z' .-]+,\s*[A-Z][A-Za-z' .-]+$/.test(line) && !/\d/.test(line) && line.split(",").length === 2 && !ROLE_WORDS.test(line) && line.split(" ").length <= 5) {
        var parts = line.split(",");
        out.city = parts[0].trim();
        out.country = parts[1].trim();
      }
    });
    return out;
  }

  /* ---------------- name & title ---------------- */
  var ROLE_WORDS = /designer|developer|engineer|manager|analyst|lead|head|director|officer|executive|consultant|teacher|nurse|accountant|specialist|coordinator|intern|associate|assistant|architect|scientist|writer|editor|marketer|seller|representative|supervisor|technician|therapist|pharmacist|attorney|lawyer|lecturer|professor|trainer|chef|auditor|banker|clerk|operator|administrator/i;
  function looksLikeName(line) {
    if (!line || line.length > 45 || /\d/.test(line) || /[@\/\\]/.test(line)) return false;
    if (isJunk(line) || sectionKey(line)) return false;
    var words = line.split(" ");
    if (words.length < 2 || words.length > 4) return false;
    return words.every(function (w) { return /^[A-Z][a-z'’.-]+$/.test(w) || /^[A-Z]\.$/.test(w); });
  }
  function looksLikeTitle(line) {
    if (!line || line.length > 65 || /\d/.test(line) || /[@\/]/.test(line)) return false;
    if (isJunk(line) || sectionKey(line)) return false;
    return ROLE_WORDS.test(line) || /^[A-Z][A-Za-z' -]+$/.test(line);
  }

  /* ---------------- experience ---------------- */
  function parseJobHeader(line) {
    var m = line.match(/^(.+?)\s+(?:at|@|—|–)\s+(.+)$/);
    if (m && m[1].trim().length > 2 && m[2].trim().length > 1 && !/^\d/.test(m[2].trim())) {
      return { title: m[1].trim(), company: m[2].trim() };
    }
    var dash = line.match(/^(.+?)\s+-\s+(.+)$/);
    if (dash && dash[1].trim().length > 2 && ROLE_WORDS.test(dash[1]) && dash[2].trim().length > 1 && !/^\d{4}/.test(dash[2].trim())) {
      return { title: dash[1].trim(), company: dash[2].trim() };
    }
    var c = line.split(",");
    if (c.length >= 2 && c[0].trim().length > 2 && c[1].trim().length > 1 && ROLE_WORDS.test(c[0]) && !/\d/.test(line)) {
      return { title: c[0].trim(), company: c.slice(1).join(",").trim() };
    }
    return null;
  }
  function isBullet(line) {
    return /^(•|·|–|-|\*|▸|►|○)\s+/.test(line);
  }
  function parseExperience(lines) {
    var jobs = [], cur = null, pendingDates = null;
    lines.forEach(function (rawLine) {
      /* bullet markers must be checked BEFORE cleanLine strips them */
      var bullet = isBullet(rawLine);
      var line = cleanLine(rawLine);
      if (!line) return;
      var dr = parseDateRange(line);
      if (dr && line.length <= dr.matched.length + 24) {
        /* a line that is basically just dates, maybe with a location */
        var rest = line.replace(dr.matched, "").replace(/^[|\s,;-]+/, "").replace(/[|\s,;-]+$/, "").trim();
        if (cur) {
          cur.start = dr.start; cur.end = dr.end; cur.current = dr.current;
          if (rest && !cur.location) cur.location = rest;
        } else {
          pendingDates = dr;
          if (rest && jobs.length === 0) pendingDates.location = rest;
        }
        return;
      }
      var header = parseJobHeader(line);
      if (header) {
        if (cur) jobs.push(cur);
        cur = { id: uid("exp"), jobTitle: header.title, company: header.company, type: "", location: "", start: "", end: "", current: false, description: "", bullets: [] };
        if (pendingDates) {
          cur.start = pendingDates.start; cur.end = pendingDates.end; cur.current = pendingDates.current;
          if (pendingDates.location) cur.location = pendingDates.location;
          pendingDates = null;
        }
        return;
      }
      if (!cur) return; /* stray line before the first job — ignore */
      if (bullet) {
        cur.bullets.push(line);
        return;
      }
      if (dr) { /* dates embedded in a longer line */
        cur.start = dr.start; cur.end = dr.end; cur.current = dr.current;
        return;
      }
      if (!cur.location && /^[A-Z][A-Za-z' .-]+(,\s*[A-Z][A-Za-z' .-]+)?$/.test(line) && line.length < 45 && !/\b(the|and|with|for|our|we|my)\b/i.test(line)) {
        cur.location = line;
        return;
      }
      if (!cur.bullets.length && !cur.description) { cur.description = line; return; }
      if (cur.bullets.length) { cur.bullets[cur.bullets.length - 1] += " " + line; return; }
      cur.description += " " + line;
    });
    if (cur) jobs.push(cur);
    return jobs;
  }

  /* ---------------- education ---------------- */
  var DEGREE_RE = /\b(BSc|MSc|MBA|BBA|BA|MA|MEng|BEng|PhD|EdD|MD|LLB|LLM|Diploma|HSC|SSC|Bachelor|Master|Doctorate|Associate)\b/i;
  function parseEducation(lines) {
    var list = [], cur = null;
    lines.forEach(function (rawLine) {
      var line = cleanLine(rawLine);
      if (!line) return;
      var dr = parseDateRange(line);
      if (dr && line.length <= dr.matched.length + 8) {
        if (cur) { cur.startYear = dr.start; cur.endYear = dr.current ? "" : dr.end; cur.current = dr.current; }
        return;
      }
      var gpa = line.match(/GPA[:\s]*([\d.]+(?:\s*\/\s*[\d.]+)?)/i);
      if (gpa && cur) { cur.gpa = gpa[1].trim(); return; }
      var years = line.match(/^(\d{4})\s*(?:–|—|-|to)\s*(\d{4}|Present)$/);
      if (years && cur) { cur.startYear = years[1]; cur.endYear = years[2] === "Present" ? "" : years[2]; cur.current = years[2] === "Present"; return; }
      if (DEGREE_RE.test(line) || / in /.test(line)) {
        if (cur) list.push(cur);
        var degree = line, institution = "", field = "";
        /* split on a dash or a comma — the comma may sit right after a word,
           e.g. "BSc in Computer Science, University of Dhaka" */
        var parts = line.split(/\s*(?:—|–)\s*|,\s*/);
        if (parts.length >= 2) {
          degree = parts[0].trim();
          institution = parts.slice(1).join(", ").trim();
          /* "BSc, Computer Science and Engineering" — the part after the
             comma is the field, not the school; the real school comes next */
          if (!/university|college|institute|school/i.test(institution)) {
            field = institution;
            institution = "";
          }
        }
        var inM = degree.match(/^(.+?)\s+in\s+(.+)$/i);
        if (inM && DEGREE_RE.test(inM[1])) { degree = inM[1].trim(); field = inM[2].trim(); }
        cur = { id: uid("edu"), degree: degree, institution: institution, field: field, startYear: "", endYear: "", current: false, gpa: "", coursework: "", description: "" };
        return;
      }
      if (cur && !cur.institution && line.length < 70 && !/\./.test(line)) { cur.institution = line; return; }
      if (cur) cur.description = (cur.description ? cur.description + " " : "") + line;
    });
    if (cur) list.push(cur);
    return list;
  }

  /* ---------------- skills / languages ---------------- */
  var LEVEL_WORDS = { expert: 5, advanced: 5, fluent: 5, native: 5, intermediate: 3, conversational: 3, beginner: 1, basic: 1 };
  function splitSkillLine(line, category) {
    var out = [];
    var cat = category || "Imported";
    var catM = line.match(/^([A-Za-z &/+-]{2,30}):\s*(.+)$/);
    if (catM && /[,;•|]/.test(catM[2])) { cat = catM[1].trim(); line = catM[2]; }
    line.split(/[,;•|]/).forEach(function (tok) {
      var t = tok.trim().replace(/^[-*]\s*/, "");
      if (!t || t.length > 45) return;
      var level = 3;
      var lm = t.match(/\((expert|advanced|fluent|native|intermediate|conversational|beginner|basic)\)/i);
      if (lm) { level = LEVEL_WORDS[lm[1].toLowerCase()] || 3; t = t.replace(/\s*\([^)]+\)\s*$/, "").trim(); }
      if (t) out.push({ id: uid("sk"), name: t, category: cat, level: level });
    });
    return out;
  }
  function parseSkills(lines) {
    var skills = [], seen = {};
    lines.forEach(function (rawLine) {
      var line = cleanLine(rawLine);
      if (!line) return;
      splitSkillLine(line).forEach(function (s) {
        var key = s.name.toLowerCase();
        if (!seen[key]) { seen[key] = true; skills.push(s); }
      });
    });
    return skills.slice(0, 60);
  }
  function parseLanguages(lines) {
    var langs = [];
    lines.forEach(function (rawLine) {
      var line = cleanLine(rawLine);
      if (!line) return;
      line.split(/[,;•|]/).forEach(function (tok) {
        var t = tok.trim().replace(/^[-*]\s*/, "");
        if (!t || t.length > 30) return;
        var level = "";
        var m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (m) { t = m[1].trim(); level = m[2].trim(); }
        if (t && !langs.some(function (l) { return l.name.toLowerCase() === t.toLowerCase(); })) {
          langs.push({ id: uid("la"), name: t, level: level });
        }
      });
    });
    return langs;
  }

  /* ---------------- projects / certifications / awards ---------------- */
  function parseProjects(lines) {
    var projects = [], cur = null;
    lines.forEach(function (rawLine) {
      /* bullet markers must be checked BEFORE cleanLine strips them */
      var bullet = isBullet(rawLine);
      var line = cleanLine(rawLine);
      if (!line) return;
      var isName = !bullet && line.length <= 60 && !/[.!?]\s/.test(line) && !parseDateRange(line) &&
        (cur === null || cur.description || line.length < 45);
      if (isName && (!cur || cur.description || cur.bullets)) {
        if (cur) projects.push(cur);
        var name = line, role = "", tech = "";
        var dash = line.match(/^(.+?)\s+(?:—|–|-)\s+(.+)$/);
        if (dash) { name = dash[1].trim(); role = dash[2].trim(); }
        cur = { id: uid("pr"), name: name, description: "", role: role, tech: tech, url: "", github: "", start: "", end: "" };
        return;
      }
      if (!cur) { cur = { id: uid("pr"), name: line, description: "", role: "", tech: "", url: "", github: "", start: "", end: "" }; return; }
      var techM = line.match(/^(?:tech(?:nologies)?|stack|built with)[:\s]+(.+)$/i);
      if (techM) { cur.tech = techM[1].trim(); return; }
      if (/^https?:\/\//.test(line)) { cur.url = line; return; }
      cur.description = (cur.description ? cur.description + " " : "") + line.replace(/^(•|·|–|-|\*)\s+/, "");
    });
    if (cur) projects.push(cur);
    return projects;
  }
  function parseCertifications(lines) {
    var list = [];
    lines.forEach(function (rawLine) {
      var line = cleanLine(rawLine);
      if (!line) return;
      var name = line, org = "";
      var m = line.match(/^(.+?)\s+(?:—|–|-|,)\s+(.+)$/);
      if (m && m[1].trim().length > 2) { name = m[1].trim(); org = m[2].trim(); }
      var yr = name.match(/\((\d{4})\)\s*$/);
      var issueDate = "";
      if (yr) { issueDate = yr[1]; name = name.replace(/\s*\(\d{4}\)\s*$/, "").trim(); }
      list.push({ id: uid("ce"), name: name, org: org, issueDate: issueDate, expiryDate: "", credentialId: "", url: "" });
    });
    return list;
  }

  /* ---------------- main parser ---------------- */
  function splitIntoSections(lines) {
    var sections = { preamble: [] };
    var current = "preamble";
    lines.forEach(function (line) {
      var key = sectionKey(line);
      if (key) { current = key; sections[current] = sections[current] || []; return; }
      (sections[current] = sections[current] || []).push(line);
    });
    return sections;
  }

  function parseResumeText(text) {
    var rawLines = linesOf(text);
    var lines = rawLines.filter(function (l) { return l !== "" && !isJunk(l); });
    var sections = splitIntoSections(lines);
    var r = blankResume();

    /* preamble: name, title, contacts, fallback summary */
    var pre = sections.preamble || [];
    var contacts = extractContacts(lines);
    r.personal.email = contacts.email;
    r.personal.phone = contacts.phone;
    r.personal.linkedin = contacts.linkedin;
    r.personal.github = contacts.github;
    r.personal.website = contacts.website;
    r.personal.city = contacts.city;
    r.personal.country = contacts.country;
    var nameIdx = -1;
    for (var i = 0; i < pre.length; i++) {
      if (looksLikeName(pre[i])) { nameIdx = i; break; }
      if (i > 4) break;
    }
    if (nameIdx >= 0) {
      r.personal.fullName = pre[nameIdx];
      for (var j = nameIdx + 1; j < Math.min(pre.length, nameIdx + 3); j++) {
        if (looksLikeTitle(pre[j])) { r.personal.title = pre[j]; break; }
        if (EMAIL_RE.test(pre[j]) || PHONE_RE.test(pre[j])) break;
      }
    }
    if (sections.summary && sections.summary.length) {
      r.summary = sections.summary.join(" ");
    } else {
      /* fallback: sentences in the preamble after the name/title/contact lines */
      var rest = pre.filter(function (l, idx) {
        if (idx <= nameIdx) return false;
        if (EMAIL_RE.test(l) || PHONE_RE.test(l) || /linkedin|github|https?:\/\//i.test(l)) return false;
        if (looksLikeTitle(l) && idx === nameIdx + 1) return false;
        return l.indexOf(" ") !== -1 && l.length > 40;
      });
      if (rest.length) r.summary = rest.slice(0, 3).join(" ").slice(0, 600);
    }
    if (sections.experience) r.experience = parseExperience(sections.experience);
    if (sections.education) r.education = parseEducation(sections.education);
    if (sections.skills) r.skills = parseSkills(sections.skills);
    if (sections.projects) r.projects = parseProjects(sections.projects);
    if (sections.certifications) r.certifications = parseCertifications(sections.certifications);
    if (sections.languages) r.languages = parseLanguages(sections.languages);
    if (sections.awards && sections.awards.length) {
      r.customSections.push({ id: uid("cs"), title: "Awards", content: sections.awards.join(" • ") });
    }
    r.title = r.personal.fullName ? r.personal.fullName + " — CV" : "Imported CV";
    var report = {
      name: r.personal.fullName || "(no name found)",
      title: r.personal.title || "",
      email: r.personal.email || "",
      jobs: r.experience.length, education: r.education.length, skills: r.skills.length,
      projects: r.projects.length, certifications: r.certifications.length, languages: r.languages.length,
      hasSummary: !!r.summary
    };
    return { resume: r, report: report };
  }

  /* ---------------- file reading ---------------- */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("Could not load " + src)); };
      document.head.appendChild(s);
    });
  }
  function readAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error("Could not read the file.")); };
      reader.readAsText(file);
    });
  }
  function extractPdfText(file) {
    return loadScript(PDFJS_URL).then(function () {
      if (!window.pdfjsLib) throw new Error("PDF library did not load.");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return file.arrayBuffer();
    }).then(function (buf) {
      return window.pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (pdf) {
      var jobs = [];
      for (var p = 1; p <= pdf.numPages; p++) {
        jobs.push(pdf.getPage(p).then(function (page) {
          return page.getTextContent();
        }).then(function (content) {
          return content.items.map(function (it) { return it.str; }).join("\n");
        }));
      }
      return Promise.all(jobs);
    }).then(function (pages) { return pages.join("\n"); });
  }
  function extractDocxText(file) {
    return loadScript(MAMMOTH_URL).then(function () {
      if (!window.mammoth) throw new Error("Word library did not load.");
      return file.arrayBuffer();
    }).then(function (buf) {
      return window.mammoth.extractRawText({ arrayBuffer: buf });
    }).then(function (result) { return result.value; });
  }
  function extractTextFromFile(file) {
    var name = (file.name || "").toLowerCase();
    if (/\.pdf$/.test(name)) return extractPdfText(file);
    if (/\.docx$/.test(name)) return extractDocxText(file);
    if (/\.doc$/.test(name)) return Promise.reject(new Error("Old .doc files cannot be read here. Save it as .docx, or copy the text and paste it below."));
    if (/\.(txt|md|markdown|text)$/.test(name)) return readAsText(file);
    return Promise.reject(new Error("That file type is not supported. Use PDF, Word (.docx), TXT or Markdown — or paste the text."));
  }

  /* ---------------- applying the parsed CV ---------------- */
  function applyParsed(parsed, mode) {
    var store = window.CvoraStore;
    var current = window.CvoraEditor ? window.CvoraEditor.current : null;
    var src = parsed.resume;
    var report = parsed.report;
    if (mode === "replace" && current) {
      var keepTemplate = current.templateId, keepDesign = current.design, keepId = current.id;
      var keepTitle = current.title && current.title !== "Untitled CV" ? current.title : src.title;
      var fields = ["personal", "summary", "objective", "yearsExp", "industry", "currentRole", "experience", "education", "skills", "projects", "certifications", "languages", "customSections", "sectionOrder", "hiddenSections"];
      fields.forEach(function (f) { current[f] = JSON.parse(JSON.stringify(src[f])); });
      current.templateId = keepTemplate;
      current.design = keepDesign;
      current.id = keepId;
      current.title = keepTitle;
      store.saveResume(current);
      return { resume: current, report: report, mode: "replace" };
    }
    var fresh = blankResume();
    var contentFields = ["personal", "summary", "objective", "yearsExp", "industry", "currentRole", "experience", "education", "skills", "projects", "certifications", "languages", "customSections", "sectionOrder", "hiddenSections"];
    contentFields.forEach(function (f) { fresh[f] = JSON.parse(JSON.stringify(src[f])); });
    fresh.title = src.title;
    store.saveResume(fresh);
    return { resume: fresh, report: report, mode: "new" };
  }

  /* ---------------- modal UI (browser only) ---------------- */
  var pendingParsed = null;
  var pendingMode = "new";
  function $(id) { return document.getElementById(id); }
  function setStatus(msg, isError) {
    var el = $("importStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "#dc2626" : "";
  }
  function showResults(parsed) {
    pendingParsed = parsed;
    var rep = parsed.report;
    var rows = [];
    if (rep.name && rep.name !== "(no name found)") rows.push("Name: <b>" + escapeHtml(rep.name) + "</b>" + (rep.title ? " — " + escapeHtml(rep.title) : ""));
    if (rep.email) rows.push("Email: " + escapeHtml(rep.email));
    if (rep.hasSummary) rows.push("Professional summary: found");
    rows.push("Work experience: <b>" + rep.jobs + "</b> job" + (rep.jobs === 1 ? "" : "s"));
    rows.push("Education: <b>" + rep.education + "</b>");
    rows.push("Skills: <b>" + rep.skills + "</b>");
    rows.push("Projects: <b>" + rep.projects + "</b> • Certifications: <b>" + rep.certifications + "</b> • Languages: <b>" + rep.languages + "</b>");
    $("importSummary").innerHTML = "<ul><li>" + rows.join("</li><li>") + "</li></ul>" +
      "<p class=\"hint\">Check the details in the editor afterwards — the parser reads the text, it does not guess what is not there.</p>";
    $("importResults").classList.remove("hidden");
    $("importReplaceBtn").classList.toggle("hidden", pendingMode !== "replace");
    setStatus("Parsed. Review what was found, then choose how to use it.");
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function parseSourceText(text) {
    if (!text || !text.trim()) { setStatus("Nothing to parse — upload a file or paste some CV text first.", true); return; }
    setStatus("Reading your CV…");
    setTimeout(function () {
      try {
        var parsed = parseResumeText(text);
        showResults(parsed);
      } catch (e) {
        setStatus("Could not read that CV: " + (e && e.message ? e.message : "unknown error"), true);
      }
    }, 30);
  }
  function open(mode) {
    pendingMode = mode === "replace" ? "replace" : "new";
    pendingParsed = null;
    var modal = $("importModal");
    if (!modal) return;
    var fileInput = $("importFile");
    if (fileInput) fileInput.value = "";
    var paste = $("importPaste");
    if (paste) paste.value = "";
    $("importResults").classList.add("hidden");
    $("importSummary").innerHTML = "";
    setStatus(pendingMode === "replace"
      ? "Upload your CV — its text will replace this CV's content. Your template and design stay the same."
      : "Upload your CV — CVora will build a new editable CV from it.");
    $("importTitle").textContent = pendingMode === "replace" ? "Upload an existing CV" : "Upload an existing CV — new CV";
    modal.classList.remove("hidden");
  }
  function close() {
    var modal = $("importModal");
    if (modal) modal.classList.add("hidden");
  }
  function finish(mode) {
    if (!pendingParsed) { setStatus("Parse a CV first.", true); return; }
    var result = applyParsed(pendingParsed, mode);
    close();
    if (window.CvoraEditor) window.CvoraEditor.open(result.resume.id);
    if (window.CvoraApp) {
      window.CvoraApp.toast(result.mode === "replace"
        ? "CV replaced with your uploaded file — edit anything, then download it."
        : "New CV created from your upload — edit anything, then download it.");
    }
  }
  function bindOnce() {
    if (bindOnce._done) return;
    bindOnce._done = true;
    var fileInput = $("importFile");
    var drop = $("importDrop");
    if (drop && fileInput) {
      drop.addEventListener("click", function () { fileInput.click(); });
      drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("drag"); });
      drop.addEventListener("dragleave", function () { drop.classList.remove("drag"); });
      drop.addEventListener("drop", function (e) {
        e.preventDefault();
        drop.classList.remove("drag");
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) handleFile(f);
      });
    }
    if (fileInput) fileInput.addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) handleFile(f);
      e.target.value = "";
    });
    var parseBtn = $("importParseBtn");
    if (parseBtn) parseBtn.addEventListener("click", function () {
      var pasted = $("importPaste").value;
      if (pasted && pasted.trim()) { parseSourceText(pasted); return; }
      setStatus("Paste your CV text below, or choose a file above.", true);
    });
    var replaceBtn = $("importReplaceBtn");
    if (replaceBtn) replaceBtn.addEventListener("click", function () { finish("replace"); });
    var newBtn = $("importNewBtn");
    if (newBtn) newBtn.addEventListener("click", function () { finish("new"); });
    var closeBtn = $("importCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", close);
  }
  function handleFile(file) {
    var name = (file.name || "").toLowerCase();
    setStatus("Reading " + file.name + "…");
    $("importResults").classList.add("hidden");
    if (/\.json$/.test(name)) {
      window.CvoraExport.importJsonFile(file, function (res) {
        if (!res.ok) { setStatus(res.error + " Try the file's text instead, or paste it below.", true); return; }
        close();
        if (window.CvoraEditor) window.CvoraEditor.open(res.resume.id);
        if (window.CvoraApp) window.CvoraApp.toast("CVora resume imported.");
      });
      return;
    }
    extractTextFromFile(file).then(function (text) {
      parseSourceText(text);
    }).catch(function (e) {
      setStatus((e && e.message ? e.message : "Could not read that file.") +
        " If it is a PDF or Word file, check your internet connection — the parser libraries load from a CDN — or copy the text and paste it below.", true);
    });
  }

  var api = {
    open: open,
    close: close,
    parseResumeText: parseResumeText,
    extractTextFromFile: extractTextFromFile,
    applyParsed: applyParsed,
    bindOnce: bindOnce
  };
  if (typeof window !== "undefined") {
    window.CvoraImport = api;
    if (typeof document !== "undefined" && document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bindOnce);
    } else if (typeof document !== "undefined") {
      bindOnce();
    }
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
