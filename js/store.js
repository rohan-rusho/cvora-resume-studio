/* CVora store — resumes, cover letters, settings and a local demo account.
   Everything persists in localStorage on this device. There is no server in
   this build: the README documents the Supabase backend as the next step.
   Auth here is a demo account for trying the dashboard — it is NOT real
   server authentication and the UI says so. */
(function () {
  "use strict";

  var LS = {
    user: "cvora.user.v1",
    resumes: "cvora.resumes.v1",
    letters: "cvora.letters.v1",
    admin: "cvora.admin.v1",
    downloads: "cvora.downloads.v1"
  };

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* full/blocked */ }
  }
  function uid(p) {
    return p + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);
  }
  function now() { return new Date().toISOString(); }
  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return "h" + (h >>> 0).toString(36);
  }

  function blankResume() {
    return {
      id: uid("cv"),
      title: "Untitled CV",
      templateId: "executive-classic",
      createdAt: now(),
      updatedAt: now(),
      design: {
        accent: "", font: "", layout: "", header: "", skill: "", heading: "",
        divider: "", photo: "", sidebar: "", bg: "",
        nameSize: 28, bodySize: 11, lineHeight: 1.5,
        margin: 18, spacing: 10, pageSize: "A4"
      },
      hiddenSections: [],
      sectionOrder: ["summary", "experience", "education", "skills", "projects", "certifications", "languages", "custom"],
      personal: {
        fullName: "", title: "", email: "", phone: "", country: "", city: "",
        address: "", linkedin: "", portfolio: "", website: "", github: "",
        photo: "", show: { email: true, phone: true, linkedin: true, portfolio: true, website: true, github: true, address: false }
      },
      summary: "", objective: "", yearsExp: "", industry: "", currentRole: "",
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      customSections: []
    };
  }

  function sampleResume() {
    var r = blankResume();
    r.title = "Sample — Product Designer";
    r.templateId = "modern-horizon";
    r.personal = {
      fullName: "Ayesha Rahman", title: "Senior Product Designer",
      email: "ayesha.rahman@example.com", phone: "+880 1XXX-XXXXXX",
      country: "Bangladesh", city: "Dhaka", address: "",
      linkedin: "linkedin.com/in/ayeshamrahman", portfolio: "ayeshamrahman.design",
      website: "", github: "", photo: "",
      show: { email: true, phone: true, linkedin: true, portfolio: true, website: true, github: true, address: false }
    };
    r.summary = "Product designer with 6 years of experience shipping mobile and web products for fintech and e-commerce. I turn messy problems into clear, measurable interfaces — my last redesign lifted activation by 34%.";
    r.objective = "";
    r.yearsExp = "6"; r.industry = "Technology"; r.currentRole = "Senior Product Designer";
    r.experience = [
      { id: uid("exp"), jobTitle: "Senior Product Designer", company: "FinEdge Ltd.", type: "Full-time", location: "Dhaka", start: "2022-03", end: "", current: true, description: "Lead designer for the consumer banking app (2M users).", bullets: ["Redesigned onboarding, lifting activation by 34%", "Built the design system used by 4 product teams", "Ran weekly usability tests with 12 participants"] },
      { id: uid("exp"), jobTitle: "UI/UX Designer", company: "ShopCart", type: "Full-time", location: "Dhaka", start: "2019-06", end: "2022-02", current: false, description: "Designed checkout and seller tools for a growing marketplace.", bullets: ["Cut checkout drop-off by 18% with a one-page flow", "Shipped 40+ screens across web and Android"] }
    ];
    r.education = [
      { id: uid("edu"), degree: "BSc in Computer Science", institution: "University of Dhaka", field: "Computer Science", startYear: "2015", endYear: "2019", current: false, gpa: "3.8", coursework: "HCI, Visual Design, Data Structures", description: "" }
    ];
    r.skills = [
      { id: uid("sk"), name: "Figma", category: "Software and Tools", level: 5 },
      { id: uid("sk"), name: "Design Systems", category: "Technical Skills", level: 5 },
      { id: uid("sk"), name: "User Research", category: "Technical Skills", level: 4 },
      { id: uid("sk"), name: "Prototyping", category: "Technical Skills", level: 5 },
      { id: uid("sk"), name: "Communication", category: "Soft Skills", level: 4 },
      { id: uid("sk"), name: "English", category: "Languages", level: 5 }
    ];
    r.projects = [
      { id: uid("pr"), name: "FinEdge Design System", description: "Component library with 120+ components and tokens.", role: "Lead Designer", tech: "Figma, Tokens, Storybook", url: "", github: "", start: "2023-01", end: "" }
    ];
    r.certifications = [
      { id: uid("ce"), name: "Google UX Design Certificate", org: "Google / Coursera", issueDate: "2021-05", expiryDate: "", credentialId: "", url: "" }
    ];
    r.languages = [{ id: uid("la"), name: "Bengali", level: "Native" }, { id: uid("la"), name: "English", level: "Advanced" }];
    r.customSections = [
      { id: uid("cs"), title: "Awards", content: "Best Mobile App Design — BASIS ICT Awards 2023" }
    ];
    return r;
  }

  var store = {
    user: load(LS.user, null),
    resumes: load(LS.resumes, []),
    letters: load(LS.letters, []),
    admin: load(LS.admin, { brandName: "CVora", accent: "#4f46e5", templateFlags: {} }),
    downloads: load(LS.downloads, 0),

    persistResumes: function () { save(LS.resumes, this.resumes); },
    persistLetters: function () { save(LS.letters, this.letters); },
    persistAdmin: function () { save(LS.admin, this.admin); },

    /* ---------- demo auth ---------- */
    register: function (name, email, password) {
      var users = load("cvora.accounts.v1", []);
      if (users.some(function (u) { return u.email === email.toLowerCase(); })) {
        return { ok: false, error: "An account with this email already exists on this device." };
      }
      var user = { id: uid("u"), name: name, email: email.toLowerCase(), pass: hash(password), createdAt: now() };
      users.push(user);
      save("cvora.accounts.v1", users);
      this.user = { id: user.id, name: user.name, email: user.email };
      save(LS.user, this.user);
      return { ok: true };
    },
    login: function (email, password) {
      var users = load("cvora.accounts.v1", []);
      var found = users.find(function (u) { return u.email === email.toLowerCase() && u.pass === hash(password); });
      if (!found) return { ok: false, error: "Email or password is incorrect." };
      this.user = { id: found.id, name: found.name, email: found.email };
      save(LS.user, this.user);
      return { ok: true };
    },
    logout: function () {
      this.user = null;
      try { localStorage.removeItem(LS.user); } catch (e) { /* ignore */ }
    },
    resetPassword: function (email, newPassword) {
      var users = load("cvora.accounts.v1", []);
      var found = users.find(function (u) { return u.email === email.toLowerCase(); });
      if (!found) return { ok: false, error: "No account with this email on this device." };
      found.pass = hash(newPassword);
      save("cvora.accounts.v1", users);
      return { ok: true };
    },

    /* ---------- resumes ---------- */
    getResume: function (id) { return this.resumes.find(function (r) { return r.id === id; }); },
    saveResume: function (resume) {
      resume.updatedAt = now();
      var i = this.resumes.findIndex(function (r) { return r.id === resume.id; });
      if (i === -1) this.resumes.unshift(resume); else this.resumes[i] = resume;
      this.persistResumes();
    },
    newResume: function (title, templateId) {
      var r = blankResume();
      if (title) r.title = title;
      if (templateId) r.templateId = templateId;
      this.saveResume(r);
      return r;
    },
    duplicateResume: function (id) {
      var src = this.getResume(id);
      if (!src) return null;
      var copy = JSON.parse(JSON.stringify(src));
      copy.id = uid("cv");
      copy.title = src.title + " (copy)";
      copy.createdAt = now();
      this.saveResume(copy);
      return copy;
    },
    deleteResume: function (id) {
      this.resumes = this.resumes.filter(function (r) { return r.id !== id; });
      this.persistResumes();
    },

    /* ---------- cover letters ---------- */
    getLetter: function (id) { return this.letters.find(function (l) { return l.id === id; }); },
    saveLetter: function (letter) {
      letter.updatedAt = now();
      var i = this.letters.findIndex(function (l) { return l.id === letter.id; });
      if (i === -1) this.letters.unshift(letter); else this.letters[i] = letter;
      this.persistLetters();
    },
    newLetter: function (fromResume) {
      var p = fromResume ? fromResume.personal : { fullName: "", email: "", phone: "", city: "", country: "" };
      var letter = {
        id: uid("cl"), title: "Cover Letter",
        templateId: fromResume ? fromResume.templateId : "executive-classic",
        style: "classic",
        applicantName: p.fullName || "", email: p.email || "", phone: p.phone || "",
        city: p.city || "", country: p.country || "",
        recipientName: "", company: "", jobTitle: "", date: new Date().toISOString().slice(0, 10),
        opening: "", body: "", closing: "",
        createdAt: now(), updatedAt: now()
      };
      this.saveLetter(letter);
      return letter;
    },
    deleteLetter: function (id) {
      this.letters = this.letters.filter(function (l) { return l.id !== id; });
      this.persistLetters();
    },

    /* ---------- template flags (admin) ---------- */
    templateFlags: function (templateId) {
      return this.admin.templateFlags[templateId] || {};
    },
    templateActive: function (t) {
      var f = this.templateFlags(t.id);
      return f.active !== false;
    },
    templatePremium: function (t) {
      var f = this.templateFlags(t.id);
      return f.premium != null ? f.premium : !!t.premium;
    },
    templateFeatured: function (t) {
      var f = this.templateFlags(t.id);
      return !!f.featured;
    },

    recordDownload: function () {
      this.downloads++;
      save(LS.downloads, this.downloads);
    }
  };

  window.CvoraStore = store;
  window.CvoraBlankResume = blankResume;
  window.CvoraSampleResume = sampleResume;
})();
