/* CVora app — views, gallery, dashboard, cover letters, admin, auth, legal. */
(function () {
  "use strict";

  var store = window.CvoraStore;
  var favorites = loadFavs();
  var galleryFilter = { q: "", cat: "All", ats: false, fav: false, sort: "name" };
  var currentLetter = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return window.CvoraRender.esc(s); }
  function loadFavs() {
    try { return JSON.parse(localStorage.getItem("cvora.favorites.v1") || "[]"); } catch (e) { return []; }
  }
  function saveFavs() { try { localStorage.setItem("cvora.favorites.v1", JSON.stringify(favorites)); } catch (e) { /* ignore */ } }

  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.add("hidden"); }, 2600);
  }

  /* ---------------- views ---------------- */
  var VIEWS = ["landing", "templates", "editor", "dashboard", "cover", "admin"];
  function showView(name, anchor) {
    VIEWS.forEach(function (v) { $("view-" + v).classList.toggle("hidden", v !== name); });
    window.scrollTo({ top: 0 });
    if (name === "templates") renderGallery();
    if (name === "dashboard") renderDashboard();
    if (name === "admin") renderAdmin();
    if (name === "landing" && anchor) {
      setTimeout(function () {
        var el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }

  /* ---------------- thumbnail scaling ---------------- */
  function scaleThumbs(root) {
    (root || document).querySelectorAll(".cv-thumb-holder").forEach(function (holder) {
      var doc = holder.querySelector(".cv-doc");
      if (!doc) return;
      var w = holder.clientWidth || 300;
      var scale = w / 794;
      doc.style.transform = "scale(" + scale + ")";
      holder.style.height = (doc.offsetHeight * scale) + "px";
    });
  }
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { scaleThumbs(document); }, 200);
  });

  /* ---------------- landing ---------------- */
  var FAQ = [
    ["How do I create a CV?", "Click Create My Resume, fill in the guided forms, pick a template and download. Most people finish in under 10 minutes."],
    ["Are the templates ATS-friendly?", "Many are — look for the ATS badge. The built-in ATS checker also scores your CV and tells you what to fix."],
    ["Can I download my CV as a PDF?", "Yes. Download PDF produces a real print-ready A4 (or US Letter) PDF from the live document — selectable text, clickable links, multi-page."],
    ["Can I create multiple CVs?", "Yes — create one per application, duplicate any CV to make a variation, and manage them all from your dashboard."],
    ["Can I edit my CV later?", "Yes. Every change autosaves on your device, so you can close the tab and come back later."],
    ["Can I use my own profile photo?", "Yes, upload one in the Personal step. It only shows on templates designed with a photo."],
    ["Are there free templates?", "In this demo build all 55 templates are free to use. The data model supports Free/Premium flags for a future paywall."],
    ["Can I create a cover letter?", "Yes — the Cover Letter Builder matches your CV template and downloads as PDF too."],
    ["Is my personal information secure?", "In this build your data never leaves your browser — it is stored in localStorage on your device. A real backend with Supabase is documented in the README."],
    ["Can I change my CV design after creating it?", "Any time. Switch templates, colors, fonts or section order — your information is never erased by a design change."]
  ];
  function renderLanding() {
    var hero = $("heroVisual");
    hero.innerHTML = "";
    ["executive-classic", "modern-horizon", "creative-portfolio"].forEach(function (id) {
      hero.appendChild(window.CvoraRender.thumbnail(id));
    });
    var showcase = $("showcaseGrid");
    showcase.innerHTML = "";
    ["modern-horizon", "executive-classic", "developer-pro", "fresh-graduate"].forEach(function (id) {
      showcase.appendChild(templateCard(window.CvoraRender.template(id)));
    });
    var chips = $("categoryChips");
    chips.innerHTML = "";
    window.CVORA_CATEGORIES.slice(1).forEach(function (cat) {
      var b = document.createElement("button");
      b.className = "cat-chip";
      b.type = "button";
      b.textContent = cat;
      b.addEventListener("click", function () { galleryFilter.cat = cat; showView("templates"); });
      chips.appendChild(b);
    });
    var faq = $("faqList");
    faq.innerHTML = "";
    FAQ.forEach(function (pair) {
      var item = document.createElement("div");
      item.className = "faq-item";
      item.innerHTML = '<button class="faq-q" type="button">' + esc(pair[0]) + '</button><div class="faq-a hidden">' + esc(pair[1]) + "</div>";
      item.querySelector(".faq-q").addEventListener("click", function () {
        item.querySelector(".faq-a").classList.toggle("hidden");
      });
      faq.appendChild(item);
    });
    requestAnimationFrame(function () { scaleThumbs(document); });
  }

  /* ---------------- template gallery ---------------- */
  function templateCard(t) {
    var card = document.createElement("div");
    card.className = "tpl-card";
    var fav = favorites.indexOf(t.id) !== -1;
    var badges = "";
    if (t.ats) badges += '<span class="badge ats">ATS-friendly</span>';
    if (store.templatePremium(t)) badges += '<span class="badge premium">Premium</span>';
    if (store.templateFeatured(t)) badges += '<span class="badge featured">Featured</span>';
    card.innerHTML =
      '<div class="tpl-thumb"></div>' +
      '<div class="tpl-info"><h3>' + esc(t.name) + '</h3><span class="tpl-cat">' + esc(t.cat) + '</span>' +
      '<p class="tpl-desc">' + esc(t.desc) + "</p>" +
      '<div class="tpl-badges">' + badges + "</div>" +
      '<div class="tpl-actions"><button class="btn btn-outline btn-sm" data-act="preview">Preview</button>' +
      '<button class="btn btn-primary btn-sm" data-act="use">Use Template</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="fav" title="Favorite">' + (fav ? "★" : "☆") + "</button></div></div>";
    card.querySelector(".tpl-thumb").appendChild(window.CvoraRender.thumbnail(t.id));
    card.querySelector('[data-act="preview"]').addEventListener("click", function () { openTemplateModal(t); });
    card.querySelector(".tpl-thumb").addEventListener("click", function () { openTemplateModal(t); });
    card.querySelector('[data-act="use"]').addEventListener("click", function () { useTemplate(t.id); });
    card.querySelector('[data-act="fav"]').addEventListener("click", function (e) {
      var i = favorites.indexOf(t.id);
      if (i === -1) favorites.push(t.id); else favorites.splice(i, 1);
      saveFavs();
      e.target.textContent = favorites.indexOf(t.id) !== -1 ? "★" : "☆";
    });
    return card;
  }

  function filteredTemplates() {
    var list = window.CVORA_TEMPLATES.filter(function (t) { return store.templateActive(t); });
    if (galleryFilter.cat !== "All") list = list.filter(function (t) { return t.cat === galleryFilter.cat; });
    if (galleryFilter.ats) list = list.filter(function (t) { return t.ats; });
    if (galleryFilter.fav) list = list.filter(function (t) { return favorites.indexOf(t.id) !== -1; });
    if (galleryFilter.q) {
      var q = galleryFilter.q.toLowerCase();
      list = list.filter(function (t) { return (t.name + " " + t.cat + " " + t.desc).toLowerCase().indexOf(q) !== -1; });
    }
    if (galleryFilter.sort === "name") list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (galleryFilter.sort === "cat") list.sort(function (a, b) { return (a.cat + a.name).localeCompare(b.cat + b.name); });
    if (galleryFilter.sort === "featured") list.sort(function (a, b) { return (store.templateFeatured(b) ? 1 : 0) - (store.templateFeatured(a) ? 1 : 0); });
    return list;
  }

  function renderGallery() {
    var grid = $("tplGrid");
    grid.innerHTML = "";
    var list = filteredTemplates();
    list.forEach(function (t) { grid.appendChild(templateCard(t)); });
    $("tplCount").textContent = list.length + " template" + (list.length === 1 ? "" : "s") +
      (galleryFilter.cat !== "All" ? " in " + galleryFilter.cat : "") +
      (list.length === 0 ? " — try clearing a filter." : "");
    var sel = $("tplCatFilter");
    if (!sel.options.length) {
      window.CVORA_CATEGORIES.forEach(function (c) {
        var o = document.createElement("option");
        o.value = c; o.textContent = c === "All" ? "All categories" : c;
        sel.appendChild(o);
      });
    }
    sel.value = galleryFilter.cat;
    requestAnimationFrame(function () { scaleThumbs(grid); });
  }

  function openTemplateModal(t) {
    $("tplModalName").textContent = t.name;
    $("tplModalMeta").textContent = t.cat + " • " + t.desc + (t.ats ? " • ATS-friendly" : "") + (store.templatePremium(t) ? " • Premium (unlocked in demo)" : "");
    var prev = $("tplModalPreview");
    prev.innerHTML = "";
    prev.appendChild(window.CvoraRender.thumbnail(t.id));
    var favBtn = $("tplModalFav");
    favBtn.textContent = favorites.indexOf(t.id) !== -1 ? "★ Favorited" : "☆ Favorite";
    favBtn.onclick = function () {
      var i = favorites.indexOf(t.id);
      if (i === -1) favorites.push(t.id); else favorites.splice(i, 1);
      saveFavs();
      favBtn.textContent = favorites.indexOf(t.id) !== -1 ? "★ Favorited" : "☆ Favorite";
      renderGallery();
    };
    $("tplModalUse").onclick = function () { closeModal("tplModal"); useTemplate(t.id); };
    openModal("tplModal");
    requestAnimationFrame(function () { scaleThumbs(prev); });
  }

  function useTemplate(templateId) {
    var t = window.CvoraRender.template(templateId);
    if (store.templatePremium(t)) toast("Premium template — unlocked in this demo build.");
    var r = window.CvoraEditor.current;
    if (r) {
      r.templateId = templateId;
      store.saveResume(r);
      window.CvoraEditor.open(r.id);
      toast("Template changed to " + t.name + " — your information is untouched.");
    } else {
      var resume = store.newResume("Untitled CV", templateId);
      window.CvoraEditor.bindOnce();
      window.CvoraEditor.open(resume.id);
    }
  }

  /* ---------------- job applications tracker ---------------- */
  function loadApps() {
    try { return JSON.parse(localStorage.getItem("cvora.apps.v1") || "[]"); } catch (e) { return []; }
  }
  function saveApps(apps) { try { localStorage.setItem("cvora.apps.v1", JSON.stringify(apps)); } catch (e) { /* ignore */ } }
  function renderApps() {
    var apps = loadApps();
    var sel = $("appCv");
    sel.innerHTML = "";
    store.resumes.forEach(function (r) {
      var o = document.createElement("option");
      o.value = r.id; o.textContent = r.title;
      sel.appendChild(o);
    });
    var list = $("appList");
    list.innerHTML = "";
    if (!apps.length) { list.innerHTML = "<li>No applications tracked yet.</li>"; return; }
    apps.forEach(function (a, i) {
      var li = document.createElement("li");
      var cv = store.getResume(a.cvId);
      li.innerHTML = "<strong>" + esc(a.job) + "</strong> at " + esc(a.company) + " — " + esc(a.status) +
        " • " + esc(a.date) + (cv ? " • CV: " + esc(cv.title) : "") + " ";
      var del = document.createElement("button");
      del.className = "btn btn-ghost btn-sm";
      del.type = "button";
      del.textContent = "Remove";
      del.addEventListener("click", function () {
        apps.splice(i, 1);
        saveApps(apps);
        renderApps();
      });
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  /* ---------------- dashboard ---------------- */
  function renderDashboard() {
    if (!store.user) { openAuth("login"); return; }
    renderApps();
    $("dashWelcome").textContent = "Welcome back, " + store.user.name.split(" ")[0];
    $("dashSub").textContent = store.user.email + " • " + store.resumes.length + " CV" + (store.resumes.length === 1 ? "" : "s") + " • " + store.letters.length + " cover letter" + (store.letters.length === 1 ? "" : "s");
    var last = store.resumes[0];
    $("dashStats").innerHTML =
      stat(store.resumes.length, "CVs created") + stat(store.letters.length, "Cover letters") +
      stat(store.downloads, "PDF downloads") +
      stat(last ? timeAgo(last.updatedAt) : "—", "Last edited");
    var grid = $("docGrid");
    grid.innerHTML = "";
    $("docEmpty").classList.toggle("hidden", store.resumes.length > 0);
    store.resumes.forEach(function (r) {
      var card = document.createElement("div");
      card.className = "doc-card";
      var thumb = document.createElement("div");
      thumb.className = "cv-thumb-holder";
      var doc = window.CvoraRender.render(r, {});
      doc.classList.add("cv-thumb");
      thumb.appendChild(doc);
      var tpl = window.CvoraRender.template(r.templateId);
      card.appendChild(thumb);
      var body = document.createElement("div");
      body.className = "doc-body";
      body.innerHTML = "<h3>" + esc(r.title) + "</h3><p class='doc-meta'>" + esc(tpl.name) + " • edited " + timeAgo(r.updatedAt) + "<br>Created " + new Date(r.createdAt).toLocaleDateString() + "</p>" +
        '<div class="doc-actions">' +
        '<button class="btn btn-primary" data-a="edit">Edit</button>' +
        '<button class="btn btn-outline" data-a="pdf">PDF</button>' +
        '<button class="btn btn-outline" data-a="dup">Duplicate</button>' +
        '<button class="btn btn-outline" data-a="rename">Rename</button>' +
        '<button class="btn btn-ghost" data-a="del">Delete</button></div>';
      body.querySelector('[data-a="edit"]').addEventListener("click", function () { window.CvoraEditor.bindOnce(); window.CvoraEditor.open(r.id); });
      body.querySelector('[data-a="pdf"]').addEventListener("click", function () { downloadResumePdf(r); });
      body.querySelector('[data-a="dup"]').addEventListener("click", function () {
        var copy = store.duplicateResume(r.id);
        toast("Duplicated as " + copy.title);
        renderDashboard();
      });
      body.querySelector('[data-a="rename"]').addEventListener("click", function () {
        var name = window.prompt("Rename CV:", r.title);
        if (name && name.trim()) { r.title = name.trim(); store.saveResume(r); renderDashboard(); }
      });
      body.querySelector('[data-a="del"]').addEventListener("click", function () {
        if (window.confirm("Delete '" + r.title + "'? This cannot be undone.")) { store.deleteResume(r.id); renderDashboard(); }
      });
      card.appendChild(body);
      grid.appendChild(card);
    });

    var lgrid = $("letterGrid");
    lgrid.innerHTML = "";
    $("letterEmpty").classList.toggle("hidden", store.letters.length > 0);
    store.letters.forEach(function (l) {
      var card = document.createElement("div");
      card.className = "doc-card";
      var body = document.createElement("div");
      body.className = "doc-body";
      body.innerHTML = "<h3>" + esc(l.title) + "</h3><p class='doc-meta'>" + esc(l.company || "No company") + " • " + esc(l.jobTitle || "No role") + "<br>Edited " + timeAgo(l.updatedAt) + "</p>" +
        '<div class="doc-actions"><button class="btn btn-primary" data-a="edit">Edit</button>' +
        '<button class="btn btn-outline" data-a="pdf">PDF</button>' +
        '<button class="btn btn-ghost" data-a="del">Delete</button></div>';
      body.querySelector('[data-a="edit"]').addEventListener("click", function () { openCoverLetter(l.id); });
      body.querySelector('[data-a="pdf"]').addEventListener("click", function () { downloadLetterPdf(l); });
      body.querySelector('[data-a="del"]').addEventListener("click", function () {
        if (window.confirm("Delete this cover letter?")) { store.deleteLetter(l.id); renderDashboard(); }
      });
      card.appendChild(body);
      lgrid.appendChild(card);
    });

    var recent = $("recentList");
    recent.innerHTML = "";
    store.resumes.slice(0, 5).forEach(function (r) {
      var li = document.createElement("li");
      li.textContent = "Edited “" + r.title + "” — " + timeAgo(r.updatedAt);
      recent.appendChild(li);
    });
    if (!store.resumes.length) recent.innerHTML = "<li>No activity yet.</li>";

    $("setName").value = store.user.name;
    $("setEmail").value = store.user.email;
    requestAnimationFrame(function () { scaleThumbs(grid); });
  }
  function stat(v, label) { return '<div class="stat"><b>' + esc(String(v)) + "</b><span>" + esc(label) + "</span></div>"; }
  function timeAgo(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    return Math.floor(s / 86400) + " d ago";
  }
  function downloadResumePdf(r) {
    store.recordDownload();
    var root = $("printRoot");
    root.innerHTML = "";
    root.appendChild(window.CvoraRender.render(r, { forPrint: true }));
    toast("Use your browser's Save as PDF to download the CV.");
    setTimeout(function () { window.print(); }, 150);
  }

  /* ---------------- cover letters ---------------- */
  function openCoverLetter(id) {
    currentLetter = store.getLetter(id);
    if (!currentLetter) return;
    fillCoverForm();
    renderCoverPreview();
    showView("cover");
  }
  function fillCoverForm() {
    var l = currentLetter;
    $("clStyle").value = l.style || "classic";
    $("clTitle").value = l.title; $("clName").value = l.applicantName; $("clEmail").value = l.email;
    $("clCity").value = l.city; $("clPhone").value = l.phone; $("clRecipient").value = l.recipientName;
    $("clCompany").value = l.company; $("clJob").value = l.jobTitle; $("clDate").value = l.date || "";
    $("clOpening").value = l.opening; $("clBody").value = l.body; $("clClosing").value = l.closing;
  }
  function readCoverForm() {
    var l = currentLetter;
    l.style = $("clStyle").value;
    l.title = $("clTitle").value; l.applicantName = $("clName").value; l.email = $("clEmail").value;
    l.city = $("clCity").value; l.phone = $("clPhone").value; l.recipientName = $("clRecipient").value;
    l.company = $("clCompany").value; l.jobTitle = $("clJob").value; l.date = $("clDate").value;
    l.opening = $("clOpening").value; l.body = $("clBody").value; l.closing = $("clClosing").value;
  }
  function renderCoverPreview() {
    var l = currentLetter;
    var tpl = window.CvoraRender.template(l.templateId);
    var accent = tpl.accent;
    var style = l.style || "classic";
    var prev = $("clPreview");
    var head = "<h1>" + esc(l.applicantName || "Your Name") + "</h1>" +
      '<p class="cl-sub">' + esc([l.email, l.phone, l.city].filter(Boolean).join(" • ")) + "</p>";
    var body = "<p>" + esc(l.date || "") + "</p>" +
      "<p>Dear " + esc(l.recipientName || "Hiring Manager") + ",</p>" +
      (l.company || l.jobTitle ? "<p><strong>Re: " + esc(l.jobTitle || "Application") + (l.company ? " at " + esc(l.company) : "") + "</strong></p>" : "") +
      "<p>" + esc(l.opening || "Your opening paragraph will appear here.") + "</p>" +
      "<p>" + esc(l.body || "Your main body will appear here.") + "</p>" +
      "<p>" + esc(l.closing || "Your closing paragraph will appear here.") + "</p>" +
      "<p>Sincerely,<br><strong>" + esc(l.applicantName || "Your Name") + "</strong></p>";
    if (style === "bold") {
      prev.innerHTML = '<div class="cl-doc cl-bold" style="--cv-accent:' + accent + '"><div class="cl-bold-head">' + head + '</div><div class="cl-bold-body">' + body + "</div></div>";
    } else {
      prev.innerHTML = '<div class="cl-doc cl-' + style + '" style="--cv-accent:' + accent + '">' + head + body + "</div>";
    }
  }
  function downloadLetterPdf(l) {
    store.recordDownload();
    var root = $("printRoot");
    root.innerHTML = "";
    var tpl = window.CvoraRender.template(l.templateId);
    var div = document.createElement("div");
    div.className = "cl-doc cl-" + (l.style || "classic");
    div.style.cssText = "max-width:none;width:210mm;min-height:297mm;padding:18mm;box-sizing:border-box;font-size:11pt;line-height:1.5;--cv-accent:" + tpl.accent + ";";
    div.innerHTML = "<h1 style='font-size:20px;margin:0 0 4px'>" + esc(l.applicantName || "Your Name") + "</h1>" +
      "<p style='color:#64748b;font-size:10pt'>" + esc([l.email, l.phone, l.city].filter(Boolean).join(" • ")) + "</p>" +
      "<p>" + esc(l.date || "") + "</p><p>Dear " + esc(l.recipientName || "Hiring Manager") + ",</p>" +
      "<p>" + esc(l.opening) + "</p><p>" + esc(l.body) + "</p><p>" + esc(l.closing) + "</p>" +
      "<p>Sincerely,<br><strong>" + esc(l.applicantName || "") + "</strong></p>";
    root.appendChild(div);
    toast("Use your browser's Save as PDF to download the cover letter.");
    setTimeout(function () { window.print(); }, 150);
  }
  function generateCoverLetter() {
    var l = currentLetter;
    var resume = store.resumes[0];
    var role = l.jobTitle || (resume && resume.personal.title) || "the role";
    var company = l.company || "your company";
    var name = l.applicantName || (resume && resume.personal.fullName) || "the applicant";
    l.opening = "I am writing to apply for the " + role + " position at " + company + ". With my background in " +
      ((resume && resume.industry) || "the field") + ", I am excited by the chance to contribute to your team.";
    var skills = resume ? resume.skills.slice(0, 3).map(function (s) { return s.name; }).join(", ") : "";
    l.body = "In my most recent role" + (resume && resume.experience[0] ? " at " + resume.experience[0].company : "") +
      ", I developed practical experience that matches what this role needs" + (skills ? ", including " + skills : "") +
      ". I am a quick learner who cares about doing good work and supporting the people around me, and I would welcome the opportunity to bring that to " + company + ".";
    l.closing = "Thank you for considering my application. I would love to discuss how I can help " + company + " in an interview. I have attached my CV for your review.";
    fillCoverForm();
    renderCoverPreview();
    toast("Draft generated — review and edit it before sending. It uses only information already in your CV.");
  }

  /* ---------------- admin ---------------- */
  function renderAdmin() {
    if (!store.user) { openAuth("login"); return; }
    var active = window.CVORA_TEMPLATES.filter(function (t) { return store.templateActive(t); }).length;
    $("adminStats").innerHTML =
      stat(store.resumes.length, "CVs created (this browser)") + stat(store.letters.length, "Cover letters") +
      stat(store.downloads, "PDF downloads") + stat(active + " / " + window.CVORA_TEMPLATES.length, "Templates active");
    var list = $("adminTplList");
    list.innerHTML = "";
    window.CVORA_TEMPLATES.forEach(function (t) {
      var row = document.createElement("div");
      row.className = "admin-tpl-row";
      var flags = store.templateFlags(t.id);
      row.innerHTML = "<b>" + esc(t.name) + " <span style='color:#64748b;font-weight:400'>(" + esc(t.cat) + ")</span></b>";
      function toggleBtn(label, on, fn) {
        var b = document.createElement("button");
        b.className = "badge" + (on ? " featured" : "");
        b.type = "button";
        b.textContent = label + (on ? " ✓" : "");
        b.addEventListener("click", function () { fn(); renderAdmin(); renderGallery(); });
        return b;
      }
      row.appendChild(toggleBtn("Active", store.templateActive(t), function () {
        flags.active = !store.templateActive(t);
        store.admin.templateFlags[t.id] = flags; store.persistAdmin();
      }));
      row.appendChild(toggleBtn("Featured", store.templateFeatured(t), function () {
        flags.featured = !store.templateFeatured(t);
        store.admin.templateFlags[t.id] = flags; store.persistAdmin();
      }));
      row.appendChild(toggleBtn("Premium", store.templatePremium(t), function () {
        flags.premium = !store.templatePremium(t);
        store.admin.templateFlags[t.id] = flags; store.persistAdmin();
      }));
      list.appendChild(row);
    });
    $("adminBrand").value = store.admin.brandName;
    $("adminAccent").value = store.admin.accent;
  }

  /* ---------------- auth ---------------- */
  var authTab = "login";
  function openModal(id) { $(id).classList.remove("hidden"); }
  function closeModal(id) { $(id).classList.add("hidden"); }
  function openAuth(tab) {
    authTab = tab || "login";
    setAuthTab(authTab);
    $("authError").classList.add("hidden");
    openModal("authModal");
  }
  function setAuthTab(tab) {
    authTab = tab;
    document.querySelectorAll(".auth-tab").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-auth-tab") === tab);
    });
    $("authTitle").textContent = tab === "login" ? "Welcome back" : tab === "register" ? "Create your account" : "Reset your password";
    $("authNameField").classList.toggle("hidden", tab !== "register");
    $("authPassField").classList.toggle("hidden", tab === "forgot");
    $("authNewPassField").classList.toggle("hidden", tab !== "forgot");
    $("authSubmit").textContent = tab === "login" ? "Log in" : tab === "register" ? "Sign up" : "Reset password";
  }
  function refreshNav() {
    var logged = !!store.user;
    $("btnLogin").classList.toggle("hidden", logged);
    $("btnSignup").classList.toggle("hidden", logged);
    $("btnLogout").classList.toggle("hidden", !logged);
    $("navDashboard").classList.toggle("hidden", !logged);
    $("navAdmin").classList.toggle("hidden", !logged);
    $("navUserChip").classList.toggle("hidden", !logged);
    if (logged) $("navUserChip").textContent = "👤 " + store.user.name;
  }
  function applyBrand() {
    document.documentElement.style.setProperty("--accent", store.admin.accent || "#4f46e5");
    var logo = document.querySelector(".logo");
    if (logo) logo.innerHTML = '<span class="logo-mark">' + esc((store.admin.brandName || "CVora").charAt(0)) + "</span> " + esc(store.admin.brandName || "CVora") + ' <span class="logo-tag">Resume Studio</span>';
  }

  /* ---------------- legal ---------------- */
  var LEGAL = {
    about: ["About CVora", "<p>CVora is a resume studio built to make professional CV creation easy for everyone. This demo build runs entirely in your browser — no server, no tracking.</p>"],
    contact: ["Contact", "<p>Email: hello@cvora.example (demo address). For support, check the Help Center or the README in the repository.</p>"],
    help: ["Help Center", "<p><strong>Create a CV:</strong> click Create My Resume, fill in the forms, pick a template, download the PDF.</p><p><strong>Autosave:</strong> every change saves automatically on your device.</p><p><strong>PDF:</strong> use Download PDF, then choose Save as PDF in your browser's print dialog.</p>"],
    privacy: ["Privacy Policy", "<p>In this demo build, all data is stored in your browser's localStorage and never sent to any server. If you connect Supabase (see README), data is stored in your own database under row-level security so only you can see your CVs.</p><p>You can delete your demo account and all local data from Dashboard → Account Settings.</p>"],
    terms: ["Terms of Service", "<p>CVora is provided as-is for demonstration. Do not enter information you would not want stored in your browser. AI writing helpers are on-device suggestions — you are responsible for the accuracy of your CV. CVora does not guarantee interviews or employment.</p>"]
  };
  function openLegal(key) {
    var l = LEGAL[key];
    if (!l) return;
    $("legalTitle").textContent = l[0];
    $("legalBody").innerHTML = l[1];
    openModal("legalModal");
  }

  /* ---------------- init ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    applyBrand();
    refreshNav();
    renderLanding();
    window.CvoraEditor.bindOnce();

    /* nav */
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var view = a.getAttribute("data-nav");
        if ((view === "dashboard" || view === "admin") && !store.user) { openAuth("login"); return; }
        showView(view, a.getAttribute("data-anchor"));
        $("navLinks").classList.remove("open");
      });
    });
    document.querySelectorAll("[data-create]").forEach(function (b) {
      b.addEventListener("click", function () { useTemplate("executive-classic"); });
    });
    $("navBurger").addEventListener("click", function () { $("navLinks").classList.toggle("open"); });
    $("btnLogin").addEventListener("click", function () { openAuth("login"); });
    $("btnSignup").addEventListener("click", function () { openAuth("register"); });
    $("btnLogout").addEventListener("click", function () {
      store.logout();
      refreshNav();
      showView("landing");
      toast("Logged out.");
    });
    document.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", function () { closeModal(b.getAttribute("data-close")); });
    });
    document.querySelectorAll(".modal").forEach(function (m) {
      m.addEventListener("click", function (e) { if (e.target === m) m.classList.add("hidden"); });
    });
    document.querySelectorAll("[data-legal]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); openLegal(a.getAttribute("data-legal")); });
    });

    /* landing CTAs */
    $("heroCreateBtn").addEventListener("click", function () { useTemplate("executive-classic"); });
    $("heroTemplatesBtn").addEventListener("click", function () { showView("templates"); });
    $("viewAllTplBtn").addEventListener("click", function () { showView("templates"); });

    /* gallery toolbar */
    $("tplSearch").addEventListener("input", function (e) { galleryFilter.q = e.target.value; renderGallery(); });
    $("tplCatFilter").addEventListener("change", function (e) { galleryFilter.cat = e.target.value; renderGallery(); });
    $("tplAtsFilter").addEventListener("change", function (e) { galleryFilter.ats = e.target.checked; renderGallery(); });
    $("tplFavOnly").addEventListener("change", function (e) { galleryFilter.fav = e.target.checked; renderGallery(); });
    $("tplSort").addEventListener("change", function (e) { galleryFilter.sort = e.target.value; renderGallery(); });

    /* dashboard */
    $("dashNewCv").addEventListener("click", function () { useTemplate("executive-classic"); });
    $("dashNewLetter").addEventListener("click", function () {
      var letter = store.newLetter(store.resumes[0] || null);
      openCoverLetter(letter.id);
    });
    $("dashLoadSample").addEventListener("click", function () {
      var s = window.CvoraSampleResume();
      store.saveResume(s);
      renderDashboard();
      toast("Sample CV loaded — open it to edit.");
    });
    $("saveSettingsBtn").addEventListener("click", function () {
      if (!store.user) return;
      var name = $("setName").value.trim();
      if (!name) { toast("Name cannot be empty."); return; }
      var users = [];
      try { users = JSON.parse(localStorage.getItem("cvora.accounts.v1") || "[]"); } catch (e) { /* ignore */ }
      var u = users.find(function (x) { return x.id === store.user.id; });
      if (u) u.name = name;
      try { localStorage.setItem("cvora.accounts.v1", JSON.stringify(users)); } catch (e) { /* ignore */ }
      store.user.name = name;
      try { localStorage.setItem("cvora.user.v1", JSON.stringify(store.user)); } catch (e) { /* ignore */ }
      refreshNav();
      renderDashboard();
      toast("Settings saved.");
    });
    $("deleteAccountBtn").addEventListener("click", function () {
      if (!window.confirm("Delete your demo account and ALL CVs and cover letters stored in this browser?")) return;
      try {
        localStorage.removeItem("cvora.accounts.v1");
        localStorage.removeItem("cvora.user.v1");
        localStorage.removeItem("cvora.resumes.v1");
        localStorage.removeItem("cvora.letters.v1");
      } catch (e) { /* ignore */ }
      store.user = null; store.resumes = []; store.letters = [];
      refreshNav();
      showView("landing");
      toast("Demo account and local data deleted.");
    });

    /* cover letter */
    $("clStyle").addEventListener("change", function () {
      if (!currentLetter) return;
      readCoverForm();
      renderCoverPreview();
      store.saveLetter(currentLetter);
    });
    ["clTitle", "clName", "clEmail", "clCity", "clPhone", "clRecipient", "clCompany", "clJob", "clDate", "clOpening", "clBody", "clClosing"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        if (!currentLetter) return;
        readCoverForm();
        renderCoverPreview();
        clearTimeout(window._clT);
        window._clT = setTimeout(function () { store.saveLetter(currentLetter); }, 600);
      });
    });
    $("clAiBtn").addEventListener("click", generateCoverLetter);
    $("clSaveBtn").addEventListener("click", function () {
      if (!currentLetter) return;
      readCoverForm();
      store.saveLetter(currentLetter);
      toast("Cover letter saved.");
    });
    $("clDownloadBtn").addEventListener("click", function () {
      if (!currentLetter) return;
      readCoverForm();
      store.saveLetter(currentLetter);
      downloadLetterPdf(currentLetter);
    });
    $("clBackBtn").addEventListener("click", function () { showView("dashboard"); });

    /* applications tracker */
    $("appAddBtn").addEventListener("click", function () {
      var job = $("appJob").value.trim(), company = $("appCompany").value.trim();
      if (!job || !company) { toast("Enter a job title and company."); return; }
      var apps = loadApps();
      apps.unshift({ job: job, company: company, status: $("appStatus").value, cvId: $("appCv").value, date: new Date().toISOString().slice(0, 10) });
      saveApps(apps);
      $("appJob").value = ""; $("appCompany").value = "";
      renderApps();
      toast("Application added.");
    });

    /* dark mode */
    var dark = false;
    try { dark = localStorage.getItem("cvora.dark.v1") === "1"; } catch (e) { /* ignore */ }
    if (dark) document.body.classList.add("dark");
    $("btnDarkMode").textContent = dark ? "☀️" : "🌙";
    $("btnDarkMode").addEventListener("click", function () {
      var on = document.body.classList.toggle("dark");
      $("btnDarkMode").textContent = on ? "☀️" : "🌙";
      try { localStorage.setItem("cvora.dark.v1", on ? "1" : "0"); } catch (e) { /* ignore */ }
    });

    /* admin */
    $("adminSaveBtn").addEventListener("click", function () {
      store.admin.brandName = $("adminBrand").value.trim() || "CVora";
      store.admin.accent = $("adminAccent").value;
      store.persistAdmin();
      applyBrand();
      toast("Website settings saved.");
    });

    /* auth */
    document.querySelectorAll(".auth-tab").forEach(function (b) {
      b.addEventListener("click", function () { setAuthTab(b.getAttribute("data-auth-tab")); });
    });
    $("authSubmit").addEventListener("click", function () {
      var email = $("authEmail").value.trim();
      var err = $("authError");
      function fail(msg) { err.textContent = msg; err.classList.remove("hidden"); }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail("Enter a valid email address."); return; }
      var res;
      if (authTab === "register") {
        var name = $("authName").value.trim();
        if (!name) { fail("Enter your full name."); return; }
        var pass = $("authPass").value;
        if (pass.length < 6) { fail("Password must be at least 6 characters."); return; }
        res = store.register(name, email, pass);
      } else if (authTab === "forgot") {
        var np = $("authNewPass").value;
        if (np.length < 6) { fail("New password must be at least 6 characters."); return; }
        res = store.resetPassword(email, np);
        if (res.ok) { toast("Password reset. Log in with your new password."); setAuthTab("login"); return; }
      } else {
        res = store.login(email, $("authPass").value);
      }
      if (!res.ok) { fail(res.error); return; }
      closeModal("authModal");
      refreshNav();
      showView("dashboard");
      toast("Welcome, " + store.user.name.split(" ")[0] + "!");
    });
  });

  window.CvoraApp = { showView: showView, toast: toast, useTemplate: useTemplate, openAuth: openAuth, refreshNav: refreshNav };
})();
