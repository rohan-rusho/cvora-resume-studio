/* CVora editor — multi-step wizard, live preview, design panel, sections,
   ATS checker and on-device writing helpers. Autosaves to localStorage. */
(function () {
  "use strict";

  var store = window.CvoraStore;
  var current = null;      /* resume being edited */
  var stepIndex = 0;
  var zoom = 1;
  var saveTimer = null;
  var aiSuggestion = null; /* {target, text} pending AI suggestion */

  var STEPS = [
    { key: "personal", label: "Personal" },
    { key: "summary", label: "Summary" },
    { key: "experience", label: "Experience" },
    { key: "education", label: "Education" },
    { key: "skills", label: "Skills" },
    { key: "projects", label: "Projects" },
    { key: "certifications", label: "Certifications" },
    { key: "languages", label: "Languages" },
    { key: "custom", label: "Additional" }
  ];
  var SECTION_LABELS = {
    summary: "Professional Summary", experience: "Work Experience", education: "Education",
    skills: "Skills", projects: "Projects", certifications: "Certifications",
    languages: "Languages", custom: "Additional Sections"
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return window.CvoraRender.esc(s); }
  function uid(p) { return p + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36); }

  /* ---------------- autosave + preview ---------------- */
  function setSaveState(text, cls) {
    var el = $("saveState");
    el.textContent = text;
    el.className = "save-state" + (cls ? " " + cls : "");
  }
  function autosave() {
    setSaveState("Saving…", "saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      store.saveResume(current);
      snapshotVersion();
      setSaveState("Saved ✓");
      renderDashboardSoon();
    }, 600);
  }
  function renderDashboardSoon() { /* dashboard re-renders when opened */ }

  function updatePreview() {
    var holder = $("previewScale");
    holder.innerHTML = "";
    var doc = window.CvoraRender.render(current, {});
    holder.appendChild(doc);
    holder.style.transform = "scale(" + zoom + ")";
    $("zoomLabel").textContent = Math.round(zoom * 100) + "%";
    var pages = Math.max(1, Math.ceil(doc.offsetHeight / 1123));
    var tpl = window.CvoraRender.template(current.templateId);
    $("previewMeta").textContent = tpl.name + " • ≈ " + pages + " page" + (pages > 1 ? "s" : "") + " • " + (current.design.pageSize || "A4");
    markDoneSteps();
    renderCompleteness();
  }

  function renderCompleteness() {
    var r = current, p = r.personal;
    var parts = [
      !!(p.fullName && p.email && p.phone),
      !!r.summary,
      r.experience.length > 0,
      r.education.length > 0,
      r.skills.length >= 5,
      r.projects.length > 0,
      r.certifications.length > 0,
      r.languages.length > 0
    ];
    var pct = Math.round(parts.filter(Boolean).length / parts.length * 100);
    var fill = $("compFill");
    if (fill) { fill.style.width = pct + "%"; $("compLabel").textContent = pct + "%"; }
  }

  /* ---------------- version history ---------------- */
  function historyKey() { return "cvora.history." + current.id + ".v1"; }
  function loadVersions() {
    try { return JSON.parse(localStorage.getItem(historyKey()) || "[]"); } catch (e) { return []; }
  }
  function snapshotVersion() {
    var versions = loadVersions();
    var snap = JSON.stringify(current);
    if (versions.length && versions[0].data === snap) return;
    versions.unshift({ at: new Date().toISOString(), data: snap });
    versions = versions.slice(0, 10);
    try { localStorage.setItem(historyKey(), JSON.stringify(versions)); } catch (e) { /* full */ }
  }
  function renderVersionList() {
    var ul = $("versionList");
    if (!ul) return;
    var versions = loadVersions();
    ul.innerHTML = "";
    if (!versions.length) { ul.innerHTML = '<li>No snapshots yet — they appear as you edit.</li>'; return; }
    versions.forEach(function (v, i) {
      var li = document.createElement("li");
      var d = new Date(v.at);
      li.innerHTML = "<span>Snapshot " + (i + 1) + " — " + d.toLocaleString() + "</span>";
      var b = document.createElement("button");
      b.className = "btn btn-outline btn-sm";
      b.type = "button";
      b.textContent = "Restore";
      b.addEventListener("click", function () {
        if (!window.confirm("Restore this version? Your current unsaved edits will be replaced.")) return;
        var data = JSON.parse(v.data);
        Object.keys(data).forEach(function (k) { current[k] = data[k]; });
        store.saveResume(current);
        buildStepPanels();
        renderDesignPanel();
        renderSectionList();
        renderAts();
        updatePreview();
        window.CvoraApp.toast("Version restored.");
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  /* ---------------- tools: headline + interview ---------------- */
  function generateHeadline() {
    var p = current.personal;
    var role = p.title || current.currentRole || "Professional";
    var skills = current.skills.slice(0, 3).map(function (s) { return s.name; }).join(" • ");
    var years = current.yearsExp ? current.yearsExp + " yrs" : "";
    var headline = role + (years ? " | " + years + " experience" : "") + (skills ? " | " + skills : "") +
      (current.industry ? " | " + current.industry : "");
    var box = $("headlineBox");
    box.innerHTML = '<div class="ai-suggestion"><span class="ai-label">LinkedIn headline — copy and paste</span>' + esc(headline) +
      '<div class="ai-row"><button type="button" class="btn btn-primary btn-sm" id="copyHeadline">Copy</button></div></div>';
    $("copyHeadline").addEventListener("click", function () {
      if (navigator.clipboard) navigator.clipboard.writeText(headline).then(function () { window.CvoraApp.toast("Headline copied."); });
    });
  }
  function generateInterview() {
    var role = current.personal.title || current.currentRole || "your role";
    var qs = [
      "Tell me about yourself — in 60 seconds, using your experience at " + (current.experience[0] ? current.experience[0].company : "your last job") + ".",
      "What is the achievement on your CV you are proudest of, and what did you actually do to make it happen?",
      "Walk me through a hard problem you solved in your role as " + role + ". What was the result?",
      "Why do you want this role, and what do you know about the company?",
      "Where do you see yourself in 3 years, and how does this role get you there?",
      "Tell me about a time you disagreed with a teammate. How did you handle it?",
      "What is a skill you are currently improving, and how are you doing it?",
      "Do you have any questions for us?"
    ];
    var box = $("interviewBox");
    box.innerHTML = '<div class="ai-suggestion"><span class="ai-label">Interview prep — practice these out loud</span>' +
      qs.map(function (q, i) { return (i + 1) + ". " + esc(q); }).join("<br><br>") + "</div>";
  }
  function fillSample() {
    if (!window.confirm("Replace this CV's content with sample data?")) return;
    var s = window.CvoraSampleResume();
    var keepId = current.id, keepTitle = current.title, keepTemplate = current.templateId, keepDesign = current.design;
    Object.keys(s).forEach(function (k) { if (k !== "id" && k !== "title" && k !== "templateId" && k !== "design") current[k] = s[k]; });
    current.id = keepId; current.title = keepTitle; current.templateId = keepTemplate; current.design = keepDesign;
    store.saveResume(current);
    buildStepPanels();
    renderDesignPanel();
    renderSectionList();
    renderAts();
    updatePreview();
    window.CvoraApp.toast("Sample data loaded — edit it to make it yours.");
  }

  function markDoneSteps() {
    var r = current;
    var done = {
      personal: !!(r.personal.fullName && r.personal.email),
      summary: !!r.summary,
      experience: r.experience.length > 0,
      education: r.education.length > 0,
      skills: r.skills.length > 0,
      projects: r.projects.length > 0,
      certifications: r.certifications.length > 0,
      languages: r.languages.length > 0,
      custom: r.customSections.length > 0
    };
    Array.prototype.forEach.call(document.querySelectorAll(".step-btn"), function (b) {
      b.classList.toggle("done", !!done[b.getAttribute("data-step")]);
    });
  }

  /* ---------------- open / steps ---------------- */
  function open(resumeId) {
    current = store.getResume(resumeId);
    if (!current) return;
    stepIndex = 0;
    zoom = 1;
    $("editorTitle").value = current.title;
    buildStepNav();
    buildStepPanels();
    renderDesignPanel();
    renderSectionList();
    renderAts();
    updatePreview();
    window.CvoraApp.showView("editor");
    document.querySelector(".editor-layout").classList.remove("preview-mode", "edit-mode");
  }

  function buildStepNav() {
    var nav = $("stepNav");
    nav.innerHTML = "";
    STEPS.forEach(function (s, i) {
      var b = document.createElement("button");
      b.className = "step-btn" + (i === stepIndex ? " active" : "");
      b.type = "button";
      b.textContent = (i + 1) + ". " + s.label;
      b.setAttribute("data-step", s.key);
      b.addEventListener("click", function () { showStep(i); });
      nav.appendChild(b);
    });
  }

  function showStep(i) {
    stepIndex = i;
    Array.prototype.forEach.call(document.querySelectorAll(".step-btn"), function (b, j) {
      b.classList.toggle("active", j === i);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".step-pane"), function (p, j) {
      p.classList.toggle("hidden", j !== i);
    });
  }

  function buildStepPanels() {
    var wrap = $("stepPanels");
    wrap.innerHTML = "";
    STEPS.forEach(function (s, i) {
      var pane = document.createElement("div");
      pane.className = "step-pane" + (i === stepIndex ? "" : " hidden");
      pane.setAttribute("data-pane", s.key);
      pane.innerHTML = stepHtml(s.key);
      wrap.appendChild(pane);
    });
    bindStepPanels();
  }

  function field(label, inner, hint) {
    return '<label class="field"><span>' + label + "</span>" + inner + "</label>" + (hint ? '<p class="hint">' + hint + "</p>" : "");
  }
  function input(id, value, type, ph) {
    return '<input type="' + (type || "text") + '" id="' + id + '" class="text-input" value="' + esc(value || "") + '" placeholder="' + esc(ph || "") + '">';
  }
  function area(id, value, rows, ph) {
    return '<textarea id="' + id + '" rows="' + (rows || 3) + '" class="text-input" placeholder="' + esc(ph || "") + '">' + esc(value || "") + "</textarea>";
  }

  function stepHtml(key) {
    var p = current.personal, r = current;
    if (key === "personal") {
      var showBoxes = ["email", "phone", "linkedin", "portfolio", "website", "github"].map(function (k) {
        return '<label class="check-inline"><input type="checkbox" data-show="' + k + '"' + (p.show[k] ? " checked" : "") + "> Show " + k + "</label>";
      }).join(" ");
      return "<h3>Personal Information</h3><p class='step-sub'>This appears at the top of your CV.</p>" +
        field("Full name", input("f-name", p.fullName, "text", "Ayesha Rahman")) +
        field("Professional title", input("f-title", p.title, "text", "Senior Product Designer")) +
        '<div class="field-row">' + field("Email", input("f-email", p.email, "email", "you@example.com")) + field("Phone", input("f-phone", p.phone, "tel", "+880 1XXX-XXXXXX")) + "</div>" +
        '<div class="field-row">' + field("City", input("f-city", p.city, "text", "Dhaka")) + field("Country", input("f-country", p.country, "text", "Bangladesh")) + "</div>" +
        field("Full address (optional)", input("f-address", p.address, "text", "House 12, Road 5, Dhanmondi")) +
        field("LinkedIn URL", input("f-linkedin", p.linkedin, "text", "linkedin.com/in/yourname")) +
        field("Portfolio URL", input("f-portfolio", p.portfolio, "text", "yourname.design")) +
        '<div class="field-row">' + field("Personal website", input("f-website", p.website, "text", "yourname.com")) + field("GitHub URL", input("f-github", p.github, "text", "github.com/yourname")) + "</div>" +
        '<div class="field"><span>Profile photo (optional)</span><input type="file" id="f-photo" accept="image/*"><p class="hint">Shown only on templates with a photo. Some ATS systems prefer no photo — you can remove it any time.</p></div>' +
        '<div class="field"><span>Show on CV</span><div>' + showBoxes + '</div><label class="check-inline"><input type="checkbox" data-show="address"' + (p.show.address ? " checked" : "") + "> Show address</label></div>";
    }
    if (key === "summary") {
      return "<h3>Professional Summary</h3><p class='step-sub'>2–4 sentences about who you are and what you bring.</p>" +
        field("Professional summary", area("f-summary", r.summary, 5, "Product designer with 6 years of experience…")) +
        '<div class="ai-row"><button class="btn btn-outline btn-sm" id="aiSummaryBtn">✦ Generate summary</button>' +
        '<button class="btn btn-outline btn-sm" id="aiConciseBtn">✦ Make it concise</button>' +
        '<button class="btn btn-outline btn-sm" id="aiGrammarBtn">✦ Check grammar</button></div>' +
        '<div id="aiSummaryBox"></div>' +
        field("Career objective (optional)", area("f-objective", r.objective, 3, "Seeking a senior design role…")) +
        '<div class="field-row">' + field("Years of experience", input("f-years", r.yearsExp, "text", "6")) + field("Industry", input("f-industry", r.industry, "text", "Technology")) + "</div>" +
        field("Current professional role", input("f-role", r.currentRole, "text", "Senior Product Designer"));
    }
    if (key === "experience") {
      return "<h3>Work Experience</h3><p class='step-sub'>Most recent first. Use bullet points for achievements.</p><div id='expList'></div>" +
        '<button class="btn btn-outline" id="addExpBtn">+ Add Experience</button>';
    }
    if (key === "education") {
      return "<h3>Education</h3><p class='step-sub'>Degrees, diplomas and formal study.</p><div id='eduList'></div>" +
        '<button class="btn btn-outline" id="addEduBtn">+ Add Education</button>';
    }
    if (key === "skills") {
      return "<h3>Skills</h3><p class='step-sub'>Add as many as you like. Group them by category and set a level if you want bars or dots.</p>" +
        '<div class="field-row">' + field("Skill name", input("skillName", "", "text", "Figma")) +
        field("Category", '<select id="skillCat" class="select-input"><option>Technical Skills</option><option>Soft Skills</option><option>Programming Languages</option><option>Software and Tools</option><option>Languages</option><option>Other Skills</option></select>') + "</div>" +
        field("Proficiency (optional)", '<select id="skillLevel" class="select-input"><option value="">No level</option><option value="1">1 — Beginner</option><option value="2">2</option><option value="3">3 — Good</option><option value="4">4 — Strong</option><option value="5">5 — Expert</option></select>') +
        '<button class="btn btn-outline" id="addSkillBtn">+ Add Skill</button>' +
        '<div class="ai-row"><button class="btn btn-ghost btn-sm" id="aiSkillsBtn">✦ Suggest skills for my role</button></div><div id="aiSkillsBox"></div>' +
        '<div id="skillList"></div>';
    }
    if (key === "projects") {
      return "<h3>Projects</h3><p class='step-sub'>Side projects, freelance work, open source.</p><div id='projList'></div>" +
        '<button class="btn btn-outline" id="addProjBtn">+ Add Project</button>';
    }
    if (key === "certifications") {
      return "<h3>Certifications</h3><p class='step-sub'>Courses, licenses and certificates.</p><div id='certList'></div>" +
        '<button class="btn btn-outline" id="addCertBtn">+ Add Certification</button>';
    }
    if (key === "languages") {
      return "<h3>Languages</h3><p class='step-sub'>Languages you speak and your level.</p>" +
        '<div class="field-row">' + field("Language", input("langName", "", "text", "English")) +
        field("Proficiency", '<select id="langLevel" class="select-input"><option>Beginner</option><option>Elementary</option><option>Intermediate</option><option>Upper Intermediate</option><option>Advanced</option><option>Native</option></select>') + "</div>" +
        '<button class="btn btn-outline" id="addLangBtn">+ Add Language</button><div id="langList"></div>';
    }
    if (key === "custom") {
      return "<h3>Additional Sections</h3><p class='step-sub'>Awards, publications, volunteering, internships — or any custom section.</p><div id='customList'></div>" +
        '<div class="field-row">' + field("Section title", input("customTitle", "", "text", "Awards")) + field("Content", input("customContent", "", "text", "Best Mobile App Design, 2023")) + "</div>" +
        '<button class="btn btn-outline" id="addCustomBtn">+ Add Section</button>' +
        '<p class="hint">Ideas: Awards and Honors, Publications, Volunteer Experience, Internships, Professional Memberships, Hobbies and Interests, References, Training, Leadership Experience.</p>';
    }
    return "";
  }

  /* ---------------- bindings ---------------- */
  function bindStepPanels() {
    var p = current.personal;
    function bind(id, fn) {
      var el = $(id);
      if (el) el.addEventListener("input", function () { fn(el.value); autosave(); updatePreview(); });
    }
    bind("f-name", function (v) { p.fullName = v; });
    bind("f-title", function (v) { p.title = v; });
    bind("f-email", function (v) { p.email = v; });
    bind("f-phone", function (v) { p.phone = v; });
    bind("f-city", function (v) { p.city = v; });
    bind("f-country", function (v) { p.country = v; });
    bind("f-address", function (v) { p.address = v; });
    bind("f-linkedin", function (v) { p.linkedin = v; });
    bind("f-portfolio", function (v) { p.portfolio = v; });
    bind("f-website", function (v) { p.website = v; });
    bind("f-github", function (v) { p.github = v; });
    bind("f-summary", function (v) { current.summary = v; });
    bind("f-objective", function (v) { current.objective = v; });
    bind("f-years", function (v) { current.yearsExp = v; });
    bind("f-industry", function (v) { current.industry = v; });
    bind("f-role", function (v) { current.currentRole = v; });

    Array.prototype.forEach.call(document.querySelectorAll("[data-show]"), function (cb) {
      cb.addEventListener("change", function () {
        p.show[cb.getAttribute("data-show")] = cb.checked;
        autosave(); updatePreview();
      });
    });

    var photo = $("f-photo");
    if (photo) photo.addEventListener("change", function () {
      var file = photo.files && photo.files[0];
      if (!file) return;
      if (file.size > 1024 * 1024) { window.CvoraApp.toast("Photo is over 1 MB — please pick a smaller image."); return; }
      var reader = new FileReader();
      reader.onload = function () { p.photo = reader.result; autosave(); updatePreview(); };
      reader.readAsDataURL(file);
    });

    /* AI buttons (summary step) */
    var b1 = $("aiSummaryBtn");
    if (b1) b1.addEventListener("click", function () { showSummarySuggestion(generateSummary()); });
    var b2 = $("aiConciseBtn");
    if (b2) b2.addEventListener("click", function () {
      var s = current.summary.trim();
      if (!s) { window.CvoraApp.toast("Write a summary first."); return; }
      var short = s.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
      showSummarySuggestion(short, "Concise version");
    });
    var b3 = $("aiGrammarBtn");
    if (b3) b3.addEventListener("click", function () {
      var issues = grammarCheck(current.summary);
      var box = $("aiSummaryBox");
      box.innerHTML = '<div class="ai-suggestion"><span class="ai-label">Writing helper — grammar check</span>' +
        (issues.length ? issues.map(esc).join("<br>") : "No common issues found. Nice and clean.") + "</div>";
    });

    renderExpList(); renderEduList(); renderSkillList(); renderProjList(); renderCertList(); renderLangList(); renderCustomList();

    var addExp = $("addExpBtn");
    if (addExp) addExp.addEventListener("click", function () {
      current.experience.push({ id: uid("exp"), jobTitle: "", company: "", type: "Full-time", location: "", start: "", end: "", current: false, description: "", bullets: [""] });
      renderExpList(); autosave(); updatePreview();
    });
    var addEdu = $("addEduBtn");
    if (addEdu) addEdu.addEventListener("click", function () {
      current.education.push({ id: uid("edu"), degree: "", institution: "", field: "", startYear: "", endYear: "", current: false, gpa: "", coursework: "", description: "" });
      renderEduList(); autosave(); updatePreview();
    });
    var addSkill = $("addSkillBtn");
    if (addSkill) addSkill.addEventListener("click", function () {
      var name = $("skillName").value.trim();
      if (!name) { window.CvoraApp.toast("Type a skill name first."); return; }
      current.skills.push({ id: uid("sk"), name: name, category: $("skillCat").value, level: $("skillLevel").value ? +$("skillLevel").value : null });
      $("skillName").value = "";
      renderSkillList(); autosave(); updatePreview();
    });
    var aiSkills = $("aiSkillsBtn");
    if (aiSkills) aiSkills.addEventListener("click", function () { suggestSkills(); });
    var addProj = $("addProjBtn");
    if (addProj) addProj.addEventListener("click", function () {
      current.projects.push({ id: uid("pr"), name: "", description: "", role: "", tech: "", url: "", github: "", start: "", end: "" });
      renderProjList(); autosave(); updatePreview();
    });
    var addCert = $("addCertBtn");
    if (addCert) addCert.addEventListener("click", function () {
      current.certifications.push({ id: uid("ce"), name: "", org: "", issueDate: "", expiryDate: "", credentialId: "", url: "" });
      renderCertList(); autosave(); updatePreview();
    });
    var addLang = $("addLangBtn");
    if (addLang) addLang.addEventListener("click", function () {
      var name = $("langName").value.trim();
      if (!name) { window.CvoraApp.toast("Type a language first."); return; }
      current.languages.push({ id: uid("la"), name: name, level: $("langLevel").value });
      $("langName").value = "";
      renderLangList(); autosave(); updatePreview();
    });
    var addCustom = $("addCustomBtn");
    if (addCustom) addCustom.addEventListener("click", function () {
      var title = $("customTitle").value.trim(), content = $("customContent").value.trim();
      if (!title || !content) { window.CvoraApp.toast("Give the section a title and some content."); return; }
      current.customSections.push({ id: uid("cs"), title: title, content: content });
      $("customTitle").value = ""; $("customContent").value = "";
      renderCustomList(); autosave(); updatePreview();
    });
  }

  /* ---------------- repeatable lists ---------------- */
  function moveItem(arr, i, dir) {
    var j = i + dir;
    if (j < 0 || j >= arr.length) return;
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  function repeatHead(item, list, renderFn, label) {
    var idx = list.indexOf(item);
    return '<div class="repeat-head"><strong>' + esc(label || "Item") + '</strong><span class="repeat-tools">' +
      '<button type="button" class="icon-btn move" data-move="-1" title="Move up">↑</button>' +
      '<button type="button" class="icon-btn move" data-move="1" title="Move down">↓</button>' +
      '<button type="button" class="icon-btn" data-del="1" title="Delete">✕</button></span></div>';
  }
  function wireRepeat(container, list, renderFn) {
    container.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = +btn.closest(".repeat-item").getAttribute("data-idx");
        list.splice(idx, 1);
        renderFn(); autosave(); updatePreview();
      });
    });
    container.querySelectorAll("[data-move]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = +btn.closest(".repeat-item").getAttribute("data-idx");
        moveItem(list, idx, +btn.getAttribute("data-move"));
        renderFn(); autosave(); updatePreview();
      });
    });
  }
  function bindInput(el, obj, key) {
    if (!el) return;
    el.addEventListener("input", function () { obj[key] = el.value; autosave(); updatePreview(); });
  }
  function bindCheck(el, obj, key) {
    if (!el) return;
    el.addEventListener("change", function () { obj[key] = el.checked; autosave(); updatePreview(); });
  }

  function renderExpList() {
    var box = $("expList");
    if (!box) return;
    box.innerHTML = "";
    if (!current.experience.length) box.innerHTML = '<p class="hint">No experience added yet.</p>';
    current.experience.forEach(function (job, i) {
      var div = document.createElement("div");
      div.className = "repeat-item";
      div.setAttribute("data-idx", i);
      div.innerHTML = repeatHead(job, current.experience, renderExpList, job.jobTitle || job.company || "Experience " + (i + 1)) +
        '<div class="field-row">' +
        '<label class="field"><span>Job title</span><input class="text-input" data-k="jobTitle" value="' + esc(job.jobTitle) + '" placeholder="Product Designer"></label>' +
        '<label class="field"><span>Company</span><input class="text-input" data-k="company" value="' + esc(job.company) + '" placeholder="FinEdge Ltd."></label></div>' +
        '<div class="field-row">' +
        '<label class="field"><span>Employment type</span><select class="select-input" data-k="type"><option' + (job.type === "Full-time" ? " selected" : "") + '>Full-time</option><option' + (job.type === "Part-time" ? " selected" : "") + '>Part-time</option><option' + (job.type === "Contract" ? " selected" : "") + '>Contract</option><option' + (job.type === "Internship" ? " selected" : "") + '>Internship</option><option' + (job.type === "Freelance" ? " selected" : "") + '>Freelance</option></select></label>' +
        '<label class="field"><span>Location</span><input class="text-input" data-k="location" value="' + esc(job.location) + '" placeholder="Dhaka"></label></div>' +
        '<div class="field-row">' +
        '<label class="field"><span>Start date</span><input type="month" class="text-input" data-k="start" value="' + esc(job.start) + '"></label>' +
        '<label class="field"><span>End date</span><input type="month" class="text-input" data-k="end" value="' + esc(job.end) + '"' + (job.current ? " disabled" : "") + '></label></div>' +
        '<label class="check-inline"><input type="checkbox" data-k="current"' + (job.current ? " checked" : "") + '> Currently working here</label>' +
        '<label class="field"><span>Job description</span><textarea class="text-input" rows="2" data-k="description" placeholder="What did this role involve?">' + esc(job.description) + "</textarea></label>" +
        '<div class="field"><span>Achievement bullets</span><div class="bullets"></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-add-bullet="1">+ Add bullet</button> ' +
        '<button type="button" class="btn btn-ghost btn-sm" data-ai-bullet="1">✦ Improve bullets</button></div>' +
        '<div class="ai-box"></div>';
      box.appendChild(div);
      div.querySelectorAll("[data-k]").forEach(function (el) {
        var k = el.getAttribute("data-k");
        if (el.type === "checkbox") {
          el.addEventListener("change", function () {
            job[k] = el.checked;
            if (k === "current") renderExpList();
            autosave(); updatePreview();
          });
        } else {
          el.addEventListener("input", function () { job[k] = el.value; autosave(); updatePreview(); });
        }
      });
      var bulletsBox = div.querySelector(".bullets");
      (job.bullets || []).forEach(function (b, bi) {
        var row = document.createElement("div");
        row.className = "bullet-row";
        row.innerHTML = '<input class="text-input" value="' + esc(b) + '" placeholder="Improved activation by 34%">' +
          '<button type="button" class="icon-btn" title="Remove bullet">✕</button>';
        row.querySelector("input").addEventListener("input", function (e) { job.bullets[bi] = e.target.value; autosave(); updatePreview(); });
        row.querySelector("button").addEventListener("click", function () { job.bullets.splice(bi, 1); renderExpList(); autosave(); updatePreview(); });
        bulletsBox.appendChild(row);
      });
      div.querySelector("[data-add-bullet]").addEventListener("click", function () {
        job.bullets.push(""); renderExpList(); autosave(); updatePreview();
      });
      div.querySelector("[data-ai-bullet]").addEventListener("click", function () {
        var improved = job.bullets.map(improveBullet);
        var box2 = div.querySelector(".ai-box");
        box2.innerHTML = '<div class="ai-suggestion"><span class="ai-label">Writing helper — stronger bullets (review before applying)</span>' +
          improved.map(esc).join("<br>") +
          '<div class="ai-row"><button type="button" class="btn btn-primary btn-sm" data-apply="1">Apply</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-dismiss="1">Dismiss</button></div></div>';
        box2.querySelector("[data-apply]").addEventListener("click", function () { job.bullets = improved; renderExpList(); autosave(); updatePreview(); });
        box2.querySelector("[data-dismiss]").addEventListener("click", function () { box2.innerHTML = ""; });
      });
    });
    wireRepeat(box, current.experience, renderExpList);
  }

  function renderEduList() {
    var box = $("eduList");
    if (!box) return;
    box.innerHTML = "";
    if (!current.education.length) box.innerHTML = '<p class="hint">No education added yet.</p>';
    current.education.forEach(function (ed, i) {
      var div = document.createElement("div");
      div.className = "repeat-item";
      div.setAttribute("data-idx", i);
      div.innerHTML = repeatHead(ed, current.education, renderEduList, ed.degree || ed.institution || "Education " + (i + 1)) +
        '<div class="field-row">' +
        '<label class="field"><span>Degree</span><input class="text-input" data-k="degree" value="' + esc(ed.degree) + '" placeholder="BSc in Computer Science"></label>' +
        '<label class="field"><span>Institution</span><input class="text-input" data-k="institution" value="' + esc(ed.institution) + '" placeholder="University of Dhaka"></label></div>' +
        '<div class="field-row">' +
        '<label class="field"><span>Field of study</span><input class="text-input" data-k="field" value="' + esc(ed.field) + '" placeholder="Computer Science"></label>' +
        '<label class="field"><span>Grade / GPA</span><input class="text-input" data-k="gpa" value="' + esc(ed.gpa) + '" placeholder="3.8"></label></div>' +
        '<div class="field-row">' +
        '<label class="field"><span>Start year</span><input class="text-input" data-k="startYear" value="' + esc(ed.startYear) + '" placeholder="2015"></label>' +
        '<label class="field"><span>Graduation year</span><input class="text-input" data-k="endYear" value="' + esc(ed.endYear) + '" placeholder="2019"' + (ed.current ? " disabled" : "") + "></label></div>" +
        '<label class="check-inline"><input type="checkbox" data-k="current"' + (ed.current ? " checked" : "") + '> Currently studying</label>' +
        '<label class="field"><span>Relevant coursework</span><input class="text-input" data-k="coursework" value="' + esc(ed.coursework) + '" placeholder="HCI, Visual Design"></label>' +
        '<label class="field"><span>Description</span><textarea class="text-input" rows="2" data-k="description">' + esc(ed.description) + "</textarea></label>";
      box.appendChild(div);
      div.querySelectorAll("[data-k]").forEach(function (el) {
        var k = el.getAttribute("data-k");
        if (el.type === "checkbox") {
          el.addEventListener("change", function () { ed[k] = el.checked; if (k === "current") renderEduList(); autosave(); updatePreview(); });
        } else {
          el.addEventListener("input", function () { ed[k] = el.value; autosave(); updatePreview(); });
        }
      });
    });
    wireRepeat(box, current.education, renderEduList);
  }

  function renderSkillList() {
    var box = $("skillList");
    if (!box) return;
    box.innerHTML = "";
    if (!current.skills.length) { box.innerHTML = '<p class="hint">No skills yet — add your first one above.</p>'; return; }
    current.skills.forEach(function (s, i) {
      var row = document.createElement("div");
      row.className = "bullet-row";
      row.innerHTML = '<span class="badge">' + esc(s.category || "Skills") + '</span><span style="flex:1">' + esc(s.name) + (s.level ? " — level " + s.level + "/5" : "") + '</span>' +
        '<button type="button" class="icon-btn" title="Remove skill">✕</button>';
      row.querySelector("button").addEventListener("click", function () { current.skills.splice(i, 1); renderSkillList(); autosave(); updatePreview(); });
      box.appendChild(row);
    });
  }

  function renderProjList() {
    var box = $("projList");
    if (!box) return;
    box.innerHTML = "";
    if (!current.projects.length) box.innerHTML = '<p class="hint">No projects yet.</p>';
    current.projects.forEach(function (pr, i) {
      var div = document.createElement("div");
      div.className = "repeat-item";
      div.setAttribute("data-idx", i);
      div.innerHTML = repeatHead(pr, current.projects, renderProjList, pr.name || "Project " + (i + 1)) +
        '<div class="field-row">' +
        '<label class="field"><span>Project name</span><input class="text-input" data-k="name" value="' + esc(pr.name) + '"></label>' +
        '<label class="field"><span>Your role</span><input class="text-input" data-k="role" value="' + esc(pr.role) + '"></label></div>' +
        '<label class="field"><span>Description</span><textarea class="text-input" rows="2" data-k="description">' + esc(pr.description) + "</textarea></label>" +
        '<div class="field-row">' +
        '<label class="field"><span>Technologies</span><input class="text-input" data-k="tech" value="' + esc(pr.tech) + '" placeholder="React, Node.js"></label>' +
        '<label class="field"><span>Project URL</span><input class="text-input" data-k="url" value="' + esc(pr.url) + '"></label></div>' +
        '<div class="field-row">' +
        '<label class="field"><span>GitHub URL</span><input class="text-input" data-k="github" value="' + esc(pr.github) + '"></label>' +
        '<label class="field"><span>Start</span><input type="month" class="text-input" data-k="start" value="' + esc(pr.start) + '"></label></div>' +
        '<label class="field"><span>End</span><input type="month" class="text-input" data-k="end" value="' + esc(pr.end) + '"></label>';
      box.appendChild(div);
      div.querySelectorAll("[data-k]").forEach(function (el) {
        var k = el.getAttribute("data-k");
        el.addEventListener("input", function () { pr[k] = el.value; autosave(); updatePreview(); });
      });
    });
    wireRepeat(box, current.projects, renderProjList);
  }

  function renderCertList() {
    var box = $("certList");
    if (!box) return;
    box.innerHTML = "";
    if (!current.certifications.length) box.innerHTML = '<p class="hint">No certifications yet.</p>';
    current.certifications.forEach(function (c, i) {
      var div = document.createElement("div");
      div.className = "repeat-item";
      div.setAttribute("data-idx", i);
      div.innerHTML = repeatHead(c, current.certifications, renderCertList, c.name || "Certification " + (i + 1)) +
        '<div class="field-row">' +
        '<label class="field"><span>Certification name</span><input class="text-input" data-k="name" value="' + esc(c.name) + '"></label>' +
        '<label class="field"><span>Issuing organization</span><input class="text-input" data-k="org" value="' + esc(c.org) + '"></label></div>' +
        '<div class="field-row">' +
        '<label class="field"><span>Issue date</span><input type="month" class="text-input" data-k="issueDate" value="' + esc(c.issueDate) + '"></label>' +
        '<label class="field"><span>Expiration date</span><input type="month" class="text-input" data-k="expiryDate" value="' + esc(c.expiryDate) + '"></label></div>' +
        '<div class="field-row">' +
        '<label class="field"><span>Credential ID</span><input class="text-input" data-k="credentialId" value="' + esc(c.credentialId) + '"></label>' +
        '<label class="field"><span>Credential URL</span><input class="text-input" data-k="url" value="' + esc(c.url) + '"></label></div>';
      box.appendChild(div);
      div.querySelectorAll("[data-k]").forEach(function (el) {
        var k = el.getAttribute("data-k");
        el.addEventListener("input", function () { c[k] = el.value; autosave(); updatePreview(); });
      });
    });
    wireRepeat(box, current.certifications, renderCertList);
  }

  function renderLangList() {
    var box = $("langList");
    if (!box) return;
    box.innerHTML = "";
    current.languages.forEach(function (l, i) {
      var row = document.createElement("div");
      row.className = "bullet-row";
      row.innerHTML = '<span style="flex:1">' + esc(l.name) + " — " + esc(l.level) + '</span><button type="button" class="icon-btn" title="Remove">✕</button>';
      row.querySelector("button").addEventListener("click", function () { current.languages.splice(i, 1); renderLangList(); autosave(); updatePreview(); });
      box.appendChild(row);
    });
  }

  function renderCustomList() {
    var box = $("customList");
    if (!box) return;
    box.innerHTML = "";
    current.customSections.forEach(function (cs, i) {
      var row = document.createElement("div");
      row.className = "bullet-row";
      row.innerHTML = '<span style="flex:1"><strong>' + esc(cs.title) + ":</strong> " + esc(cs.content) + '</span><button type="button" class="icon-btn" title="Remove">✕</button>';
      row.querySelector("button").addEventListener("click", function () { current.customSections.splice(i, 1); renderCustomList(); autosave(); updatePreview(); });
      box.appendChild(row);
    });
  }

  /* ---------------- design panel ---------------- */
  var SWATCHES = ["#4f46e5", "#0f172a", "#1e3a5f", "#0f766e", "#0369a1", "#7c3aed", "#be123c", "#b45309", "#15803d", "#db2777", "#000000"];
  function renderDesignPanel() {
    var d = current.design;
    var tpl = window.CvoraRender.template(current.templateId);
    $("designLayout").value = d.layout || "";
    $("designHeader").value = d.header || "";
    $("designAccent").value = d.accent || tpl.accent;
    $("designSidebar").value = d.sidebar || "#f1f5f9";
    $("designBg").value = d.bg || "#ffffff";
    $("designSkill").value = d.skill || "";
    $("designHeading").value = d.heading || "";
    $("designDivider").value = d.divider || "";
    $("designPhoto").value = d.photo || "";
    var sw = $("designSwatches");
    sw.innerHTML = "";
    SWATCHES.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "swatch" + ((d.accent || tpl.accent) === c ? " active" : "");
      b.type = "button";
      b.style.background = c;
      b.title = c;
      b.addEventListener("click", function () {
        current.design.accent = c;
        $("designAccent").value = c;
        renderDesignPanel(); autosave(); updatePreview();
      });
      sw.appendChild(b);
    });
    $("designFont").value = d.font || "";
    $("designNameSize").value = d.nameSize || 28;
    $("designNameSizeVal").textContent = d.nameSize || 28;
    $("designBodySize").value = d.bodySize || 11;
    $("designBodySizeVal").textContent = d.bodySize || 11;
    $("designLineHeight").value = d.lineHeight || 1.5;
    $("designLineHeightVal").textContent = d.lineHeight || 1.5;
    $("designMargin").value = d.margin != null ? d.margin : 18;
    $("designMarginVal").textContent = d.margin != null ? d.margin : 18;
    $("designSpacing").value = d.spacing != null ? d.spacing : 10;
    $("designSpacingVal").textContent = d.spacing != null ? d.spacing : 10;
    $("designPageSize").value = d.pageSize || "A4";
  }
  function bindDesignPanel() {
    function sel(id, key) {
      $(id).addEventListener("change", function (e) { current.design[key] = e.target.value; autosave(); updatePreview(); });
    }
    sel("designLayout", "layout");
    sel("designHeader", "header");
    sel("designSkill", "skill");
    sel("designHeading", "heading");
    sel("designDivider", "divider");
    sel("designPhoto", "photo");
    $("designAccent").addEventListener("input", function (e) { current.design.accent = e.target.value; autosave(); updatePreview(); });
    $("designSidebar").addEventListener("input", function (e) { current.design.sidebar = e.target.value; autosave(); updatePreview(); });
    $("designBg").addEventListener("input", function (e) { current.design.bg = e.target.value; autosave(); updatePreview(); });
    $("designFont").addEventListener("change", function (e) { current.design.font = e.target.value; autosave(); updatePreview(); });
    function range(id, valId, key, fmt) {
      $(id).addEventListener("input", function (e) {
        current.design[key] = parseFloat(e.target.value);
        $(valId).textContent = fmt ? fmt(e.target.value) : e.target.value;
        autosave(); updatePreview();
      });
    }
    range("designNameSize", "designNameSizeVal", "nameSize");
    range("designBodySize", "designBodySizeVal", "bodySize");
    range("designLineHeight", "designLineHeightVal", "lineHeight");
    range("designMargin", "designMarginVal", "margin");
    range("designSpacing", "designSpacingVal", "spacing");
    $("designPageSize").addEventListener("change", function (e) { current.design.pageSize = e.target.value; autosave(); updatePreview(); });
    $("designReset").addEventListener("click", function () {
      var tpl = window.CvoraRender.template(current.templateId);
      current.design = { accent: "", font: "", layout: "", header: "", skill: "", heading: "", divider: "", photo: "", sidebar: "", bg: "", nameSize: 28, bodySize: 11, lineHeight: 1.5, margin: 18, spacing: 10, pageSize: "A4" };
      renderDesignPanel(); autosave(); updatePreview();
      window.CvoraApp.toast("Design reset to the template defaults.");
    });
  }

  /* ---------------- sections panel ---------------- */
  function renderSectionList() {
    var ul = $("sectionList");
    ul.innerHTML = "";
    current.sectionOrder.forEach(function (key, i) {
      var li = document.createElement("li");
      var hidden = current.hiddenSections.indexOf(key) !== -1;
      if (hidden) li.className = "off";
      li.innerHTML = '<span>' + esc(SECTION_LABELS[key] || key) + '</span>' +
        '<button type="button" class="icon-btn move" data-m="-1" title="Move up">↑</button>' +
        '<button type="button" class="icon-btn move" data-m="1" title="Move down">↓</button>' +
        '<button type="button" class="icon-btn" data-eye="1" title="' + (hidden ? "Show" : "Hide") + '">' + (hidden ? "👁‍🗨 hidden" : "👁 shown") + "</button>";
      li.querySelector("[data-m='-1']").addEventListener("click", function () { moveItem(current.sectionOrder, i, -1); renderSectionList(); autosave(); updatePreview(); });
      li.querySelector("[data-m='1']").addEventListener("click", function () { moveItem(current.sectionOrder, i, 1); renderSectionList(); autosave(); updatePreview(); });
      li.querySelector("[data-eye]").addEventListener("click", function () {
        var idx = current.hiddenSections.indexOf(key);
        if (idx === -1) current.hiddenSections.push(key); else current.hiddenSections.splice(idx, 1);
        renderSectionList(); autosave(); updatePreview();
      });
      ul.appendChild(li);
    });
  }

  /* ---------------- ATS checker ---------------- */
  function computeAts() {
    var r = current, p = r.personal;
    var checks = [];
    function add(label, ok, tip) { checks.push({ label: label, ok: ok, tip: tip }); }
    add("Contact information (email + phone)", !!(p.email && p.phone), "Add both an email and a phone number.");
    add("Professional summary present", !!r.summary, "Write 2–4 sentences about your experience.");
    add("Summary is a good length (40–600 chars)", r.summary.length >= 40 && r.summary.length <= 600, "Aim for 40–600 characters.");
    add("At least one work experience", r.experience.length > 0, "Add your most recent role.");
    add("Experience has achievement bullets", r.experience.some(function (j) { return (j.bullets || []).some(Boolean); }), "Add 2–3 bullets per role with results.");
    add("Dates on experience entries", r.experience.every(function (j) { return j.start; }), "Every role needs a start date.");
    add("Education listed", r.education.length > 0, "Add your highest qualification.");
    add("At least 5 skills", r.skills.length >= 5, "Add skills from the job description.");
    add("Template is ATS-friendly", !!window.CvoraRender.template(r.templateId).ats, "Switch to an ATS-friendly template (look for the badge).");
    add("No photo on an ATS template", !(p.photo && window.CvoraRender.template(r.templateId).ats), "Photos can confuse parsers — consider removing it.");
    var score = Math.round(checks.filter(function (c) { return c.ok; }).length / checks.length * 100);
    return { score: score, checks: checks };
  }
  function renderAts() {
    var res = computeAts();
    $("atsScore").textContent = res.score;
    var ul = $("atsList");
    ul.innerHTML = "";
    res.checks.forEach(function (c) {
      var li = document.createElement("li");
      li.className = c.ok ? "ok" : "miss";
      li.textContent = (c.ok ? "✓ " : "✗ ") + c.label + (c.ok ? "" : " — " + c.tip);
      ul.appendChild(li);
    });
  }
  function checkKeywords() {
    var job = $("atsJobDesc").value.toLowerCase();
    var box = $("atsKeywords");
    if (!job.trim()) { box.innerHTML = '<p class="hint">Paste a job description first.</p>'; return; }
    var words = job.replace(/[^a-z0-9+\s#]/g, " ").split(/\s+/).filter(function (w) { return w.length > 3; });
    var stop = { "with": 1, "that": 1, "this": 1, "have": 1, "will": 1, "from": 1, "your": 1, "work": 1, "team": 1, "role": 1, "experience": 1, "skills": 1, "ability": 1, "years": 1, "company": 1 };
    var freq = {};
    words.forEach(function (w) { if (!stop[w]) freq[w] = (freq[w] || 0) + 1; });
    var top = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 20);
    var mine = (current.summary + " " + current.skills.map(function (s) { return s.name; }).join(" ") +
      " " + current.experience.map(function (j) { return (j.bullets || []).join(" "); }).join(" ")).toLowerCase();
    box.innerHTML = "<p class='hint'>Keywords from the job description — green ones already appear in your CV:</p>" +
      top.map(function (w) {
        return '<span class="' + (mine.indexOf(w) !== -1 ? "kw-match" : "kw-miss") + '">' + esc(w) + "</span>";
      }).join(" · ");
  }

  /* ---------------- on-device writing helpers ---------------- */
  var WEAK_VERBS = { "did": "delivered", "made": "built", "helped": "supported", "worked on": "led", "was responsible for": "owned", "handled": "managed", "did a lot of": "drove", "used": "applied", "created": "designed and launched", "fixed": "resolved", "improved": "increased" };
  function improveBullet(b) {
    if (!b) return b;
    var out = b.trim();
    Object.keys(WEAK_VERBS).forEach(function (weak) {
      var re = new RegExp("^" + weak + "\\b", "i");
      out = out.replace(re, WEAK_VERBS[weak]);
    });
    if (!/[.!?]$/.test(out)) out += ".";
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  function generateSummary() {
    var p = current.personal;
    var role = p.title || current.currentRole || "professional";
    var years = current.yearsExp ? current.yearsExp + " years of experience" : "experience";
    var industry = current.industry ? " in " + current.industry : "";
    var topSkills = current.skills.slice(0, 3).map(function (s) { return s.name; }).join(", ");
    var s = role.charAt(0).toUpperCase() + role.slice(1) + " with " + years + industry + ".";
    if (topSkills) s += " Skilled in " + topSkills + ".";
    var firstJob = current.experience[0];
    if (firstJob && firstJob.company) s += " Most recently at " + firstJob.company + ", where I focused on delivering measurable results.";
    s += " Looking to bring that experience to a team where I can make a real impact.";
    return s;
  }
  function showSummarySuggestion(text, label) {
    var box = $("aiSummaryBox");
    box.innerHTML = '<div class="ai-suggestion"><span class="ai-label">Writing helper — ' + esc(label || "generated summary") + ' (review before applying)</span>' +
      esc(text) +
      '<div class="ai-row"><button type="button" class="btn btn-primary btn-sm" id="aiApplySummary">Apply</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="aiDismissSummary">Dismiss</button></div></div>';
    $("aiApplySummary").addEventListener("click", function () {
      current.summary = text;
      var ta = $("f-summary");
      if (ta) ta.value = text;
      box.innerHTML = "";
      autosave(); updatePreview(); renderAts();
    });
    $("aiDismissSummary").addEventListener("click", function () { box.innerHTML = ""; });
  }
  function grammarCheck(text) {
    var issues = [];
    if (!text) return ["Nothing to check yet — write a summary first."];
    if (/  /.test(text)) issues.push("Double spaces found — tidy them up.");
    if (/\bi\b/.test(text)) issues.push("Standalone 'i' should be capital 'I'.");
    if (!/[.!?]$/.test(text.trim())) issues.push("The summary does not end with a full stop.");
    var words = text.toLowerCase().split(/\s+/);
    for (var i = 1; i < words.length; i++) {
      if (words[i] === words[i - 1] && words[i].length > 2) { issues.push("Repeated word: '" + words[i] + "'."); break; }
    }
    if (text.length > 600) issues.push("Summary is " + text.length + " characters — most recruiters prefer under 600.");
    return issues;
  }
  var SKILL_MAP = [
    { match: ["design", "designer"], skills: ["Figma", "Design Systems", "User Research", "Prototyping", "Adobe XD", "Wireframing"] },
    { match: ["develop", "engineer", "software", "program"], skills: ["JavaScript", "React", "Node.js", "Git", "REST APIs", "SQL"] },
    { match: ["market", "seo", "social"], skills: ["SEO", "Google Analytics", "Content Strategy", "Social Media", "Email Marketing", "A/B Testing"] },
    { match: ["data", "analyst", "science"], skills: ["Python", "SQL", "Excel", "Power BI", "Statistics", "Data Visualization"] },
    { match: ["project", "manager", "scrum"], skills: ["Agile", "Scrum", "Jira", "Stakeholder Management", "Risk Management", "Budgeting"] },
    { match: ["finance", "account"], skills: ["Financial Analysis", "Excel", "Budgeting", "QuickBooks", "Reporting", "Auditing"] },
    { match: ["health", "nurse", "medic"], skills: ["Patient Care", "Clinical Documentation", "EMR Systems", "Communication", "Teamwork"] },
    { match: ["teach", "educat"], skills: ["Curriculum Design", "Classroom Management", "Assessment", "Communication", "Mentoring"] }
  ];
  function suggestSkills() {
    var hay = ((current.currentRole || "") + " " + (current.personal.title || "") + " " + (current.industry || "")).toLowerCase();
    var found = [];
    SKILL_MAP.forEach(function (entry) {
      if (entry.match.some(function (m) { return hay.indexOf(m) !== -1; })) found = found.concat(entry.skills);
    });
    if (!found.length) found = ["Communication", "Teamwork", "Problem Solving", "Time Management", "Adaptability"];
    var box = $("aiSkillsBox");
    var mine = current.skills.map(function (s) { return s.name.toLowerCase(); });
    var fresh = found.filter(function (s) { return mine.indexOf(s.toLowerCase()) === -1; });
    box.innerHTML = '<div class="ai-suggestion"><span class="ai-label">Writing helper — suggested skills (tap to add)</span>' +
      fresh.map(function (s) { return '<button type="button" class="btn btn-outline btn-sm" data-skill="' + esc(s) + '">' + esc(s) + "</button>"; }).join(" ") + "</div>";
    box.querySelectorAll("[data-skill]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        current.skills.push({ id: uid("sk"), name: btn.getAttribute("data-skill"), category: "Technical Skills", level: null });
        btn.disabled = true;
        btn.textContent += " ✓";
        renderSkillList(); autosave(); updatePreview();
      });
    });
  }

  /* ---------------- zoom / print ---------------- */
  function setZoom(z) {
    zoom = Math.max(0.4, Math.min(1.6, z));
    updatePreview();
  }
  function fitZoom() {
    var scroll = $("previewScroll");
    var w = scroll.clientWidth - 48;
    setZoom(Math.min(1, w / 794));
  }
  function downloadPdf() {
    store.saveResume(current);
    store.recordDownload();
    var root = $("printRoot");
    root.innerHTML = "";
    var doc = window.CvoraRender.render(current, { forPrint: true });
    root.appendChild(doc);
    setSaveState("Saved ✓");
    window.CvoraApp.toast("Use your browser's Save as PDF to download the CV.");
    setTimeout(function () { window.print(); }, 150);
  }

  /* ---------------- init (bound once) ---------------- */
  var bound = false;
  function bindOnce() {
    if (bound) return;
    bound = true;
    bindDesignPanel();
    $("editorTitle").addEventListener("input", function (e) { current.title = e.target.value; autosave(); });
    $("btnDownloadPdf").addEventListener("click", downloadPdf);
    $("btnPrint").addEventListener("click", downloadPdf);
    $("btnDownloadPng").addEventListener("click", function () {
      store.saveResume(current);
      window.CvoraExport.exportImage(current, "png");
    });
    $("btnDownloadJpg").addEventListener("click", function () {
      store.saveResume(current);
      window.CvoraExport.exportImage(current, "jpg");
    });
    $("btnDownloadTxt").addEventListener("click", function () {
      store.saveResume(current);
      window.CvoraExport.downloadText(window.CvoraExport.toTxt(current), window.CvoraExport.fileName(current, "txt"), "text/plain");
      store.recordDownload();
      window.CvoraApp.toast("Plain-text CV downloaded.");
    });
    $("btnDownloadHtml").addEventListener("click", function () {
      store.saveResume(current);
      window.CvoraExport.toHtml(current).then(function (html) {
        window.CvoraExport.downloadText(html, window.CvoraExport.fileName(current, "html"), "text/html");
        store.recordDownload();
        window.CvoraApp.toast("Standalone HTML CV downloaded — open it in any browser.");
      });
    });
    $("btnDownloadJson").addEventListener("click", function () {
      store.saveResume(current);
      window.CvoraExport.downloadText(window.CvoraExport.toJson(current), window.CvoraExport.fileName(current, "json"), "application/json");
      window.CvoraApp.toast("CV data (JSON) downloaded — import it later from Tools.");
    });
    $("btnExportJson2").addEventListener("click", function () {
      store.saveResume(current);
      window.CvoraExport.downloadText(window.CvoraExport.toJson(current), window.CvoraExport.fileName(current, "json"), "application/json");
      window.CvoraApp.toast("CV data (JSON) downloaded.");
    });
    $("btnImportJson").addEventListener("click", function () { $("importJsonFile").click(); });
    $("importJsonFile").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      window.CvoraExport.importJsonFile(file, function (res) {
        if (!res.ok) { window.CvoraApp.toast(res.error); return; }
        window.CvoraEditor.open(res.resume.id);
        window.CvoraApp.toast("CV imported.");
      });
      e.target.value = "";
    });
    $("btnFillSample").addEventListener("click", fillSample);
    $("btnHeadline").addEventListener("click", generateHeadline);
    $("btnInterview").addEventListener("click", generateInterview);
    $("btnEditorDashboard").addEventListener("click", function () { store.saveResume(current); window.CvoraApp.showView("dashboard"); });
    $("btnEditorTemplates").addEventListener("click", function () { store.saveResume(current); window.CvoraApp.showView("templates"); });
    $("zoomIn").addEventListener("click", function () { setZoom(zoom + 0.1); });
    $("zoomOut").addEventListener("click", function () { setZoom(zoom - 0.1); });
    $("zoomFit").addEventListener("click", fitZoom);
    $("btnFullscreen").addEventListener("click", function () {
      var el = $("editorPreview");
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen();
    });
    $("atsCheckBtn").addEventListener("click", checkKeywords);
    $("modeEditBtn").addEventListener("click", function () {
      document.querySelector(".editor-layout").classList.add("edit-mode");
      document.querySelector(".editor-layout").classList.remove("preview-mode");
      $("modeEditBtn").classList.add("active"); $("modePreviewBtn").classList.remove("active");
    });
    $("modePreviewBtn").addEventListener("click", function () {
      document.querySelector(".editor-layout").classList.add("preview-mode");
      document.querySelector(".editor-layout").classList.remove("edit-mode");
      $("modePreviewBtn").classList.add("active"); $("modeEditBtn").classList.remove("active");
      setTimeout(fitZoom, 50);
    });
    document.querySelectorAll(".panel-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".panel-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var name = tab.getAttribute("data-ptab");
        document.querySelectorAll(".panel-pane").forEach(function (p) { p.classList.add("hidden"); });
        $("ptab-" + name).classList.remove("hidden");
        if (name === "ats") renderAts();
        if (name === "sections") renderSectionList();
        if (name === "tools") renderVersionList();
        if (name === "design") renderCompleteness();
      });
    });
    window.addEventListener("beforeunload", function () { if (current) store.saveResume(current); });
  }

  window.CvoraEditor = {
    open: open,
    get current() { return current; },
    updatePreview: updatePreview,
    renderAts: renderAts,
    bindOnce: bindOnce,
    downloadPdf: downloadPdf
  };
})();
