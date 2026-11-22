/* CVora renderer — turns resume data + a template config into a real CV
   document. The same renderer powers the live preview, the template
   thumbnails and the printed PDF, so what you see is what you download. */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(ym) {
    if (!ym) return "";
    var parts = String(ym).split("-");
    if (parts.length === 2 && MONTHS[+parts[1] - 1]) return MONTHS[+parts[1] - 1] + " " + parts[0];
    return ym;
  }
  function fmtRange(start, end, current) {
    var s = fmtDate(start);
    var e = current ? "Present" : fmtDate(end);
    if (!s && !e) return "";
    return s + (e ? " – " + e : "");
  }

  function template(id) {
    return (window.CVORA_TEMPLATES || []).find(function (t) { return t.id === id; }) ||
      (window.CVORA_TEMPLATES || [])[0];
  }

  function contactLine(p) {
    var items = [];
    if (p.show.email && p.email) items.push('<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + "</a>");
    if (p.show.phone && p.phone) items.push(esc(p.phone));
    var place = [p.city, p.country].filter(Boolean).join(", ");
    if (place) items.push(esc(place));
    if (p.show.address && p.address) items.push(esc(p.address));
    if (p.show.linkedin && p.linkedin) items.push('<a href="https://' + esc(p.linkedin.replace(/^https?:\/\//, "")) + '">' + esc(p.linkedin) + "</a>");
    if (p.show.portfolio && p.portfolio) items.push('<a href="https://' + esc(p.portfolio.replace(/^https?:\/\//, "")) + '">' + esc(p.portfolio) + "</a>");
    if (p.show.website && p.website) items.push('<a href="https://' + esc(p.website.replace(/^https?:\/\//, "")) + '">' + esc(p.website) + "</a>");
    if (p.show.github && p.github) items.push('<a href="https://' + esc(p.github.replace(/^https?:\/\//, "")) + '">' + esc(p.github) + "</a>");
    return items.join(" &nbsp;•&nbsp; ");
  }

  function sectionHeading(t, title) {
    return '<h2 class="cv-h2 hd-' + t.heading + '">' + esc(title) + "</h2>";
  }

  function skillHtml(t, skills) {
    if (!skills.length) return "";
    if (t.skill === "bars") {
      return '<div class="cv-skills-bars">' + skills.map(function (s) {
        var lvl = s.level ? Math.max(1, Math.min(5, s.level)) : 3;
        return '<div class="cv-skill-bar"><span class="cv-skill-name">' + esc(s.name) + '</span><span class="cv-bar"><span style="width:' + (lvl * 20) + '%"></span></span></div>';
      }).join("") + "</div>";
    }
    if (t.skill === "dots") {
      return '<div class="cv-skills-dots">' + skills.map(function (s) {
        var lvl = s.level ? Math.max(1, Math.min(5, s.level)) : 3;
        var dots = "";
        for (var i = 1; i <= 5; i++) dots += '<span class="cv-dot' + (i <= lvl ? " on" : "") + '"></span>';
        return '<div class="cv-skill-dot"><span class="cv-skill-name">' + esc(s.name) + '</span><span class="cv-dots">' + dots + "</span></div>";
      }).join("") + "</div>";
    }
    if (t.skill === "chips") {
      return '<div class="cv-skills-chips">' + skills.map(function (s) {
        return '<span class="cv-chip">' + esc(s.name) + "</span>";
      }).join("") + "</div>";
    }
    /* text: grouped by category */
    var groups = {};
    skills.forEach(function (s) {
      var cat = s.category || "Skills";
      (groups[cat] = groups[cat] || []).push(s.name);
    });
    return Object.keys(groups).map(function (cat) {
      return '<p class="cv-skill-line"><strong>' + esc(cat) + ":</strong> " + esc(groups[cat].join(", ")) + "</p>";
    }).join("");
  }

  function sectionHtml(t, key, r) {
    var h = "";
    if (key === "summary" && (r.summary || r.objective)) {
      h += sectionHeading(t, "Professional Summary");
      if (r.summary) h += '<p class="cv-summary">' + esc(r.summary) + "</p>";
      if (r.objective) h += '<p class="cv-objective"><strong>Objective:</strong> ' + esc(r.objective) + "</p>";
      if (r.yearsExp || r.industry || r.currentRole) {
        h += '<p class="cv-meta-line">' + [r.yearsExp ? esc(r.yearsExp) + " yrs experience" : "", r.industry ? esc(r.industry) : "", r.currentRole ? esc(r.currentRole) : ""].filter(Boolean).join(" &nbsp;•&nbsp; ") + "</p>";
      }
      return '<section class="cv-section">' + h + "</section>";
    }
    if (key === "experience" && r.experience.length) {
      h += sectionHeading(t, "Work Experience");
      h += r.experience.map(function (job) {
        var bullets = (job.bullets || []).filter(Boolean).map(function (b) {
          return "<li>" + esc(b) + "</li>";
        }).join("");
        return '<div class="cv-item">' +
          '<div class="cv-item-head"><span class="cv-item-title">' + esc(job.jobTitle) + '</span><span class="cv-item-date">' + esc(fmtRange(job.start, job.end, job.current)) + "</span></div>" +
          '<div class="cv-item-sub">' + esc([job.company, job.type, job.location].filter(Boolean).join(" • ")) + "</div>" +
          (job.description ? '<p class="cv-item-desc">' + esc(job.description) + "</p>" : "") +
          (bullets ? '<ul class="cv-bullets">' + bullets + "</ul>" : "") +
          "</div>";
      }).join("");
      return '<section class="cv-section">' + h + "</section>";
    }
    if (key === "education" && r.education.length) {
      h += sectionHeading(t, "Education");
      h += r.education.map(function (ed) {
        return '<div class="cv-item">' +
          '<div class="cv-item-head"><span class="cv-item-title">' + esc(ed.degree) + '</span><span class="cv-item-date">' + esc([ed.startYear, ed.current ? "Present" : ed.endYear].filter(Boolean).join(" – ")) + "</span></div>" +
          '<div class="cv-item-sub">' + esc([ed.institution, ed.field].filter(Boolean).join(" • ")) + "</div>" +
          (ed.gpa ? '<p class="cv-item-desc">GPA: ' + esc(ed.gpa) + "</p>" : "") +
          (ed.coursework ? '<p class="cv-item-desc">Coursework: ' + esc(ed.coursework) + "</p>" : "") +
          (ed.description ? '<p class="cv-item-desc">' + esc(ed.description) + "</p>" : "") +
          "</div>";
      }).join("");
      return '<section class="cv-section">' + h + "</section>";
    }
    if (key === "skills" && r.skills.length) {
      return '<section class="cv-section">' + sectionHeading(t, "Skills") + skillHtml(t, r.skills) + "</section>";
    }
    if (key === "projects" && r.projects.length) {
      h += sectionHeading(t, "Projects");
      h += r.projects.map(function (pr) {
        return '<div class="cv-item">' +
          '<div class="cv-item-head"><span class="cv-item-title">' + esc(pr.name) + '</span><span class="cv-item-date">' + esc(fmtRange(pr.start, pr.end, false)) + "</span></div>" +
          (pr.role ? '<div class="cv-item-sub">' + esc(pr.role) + (pr.tech ? " • " + esc(pr.tech) : "") + "</div>" : (pr.tech ? '<div class="cv-item-sub">' + esc(pr.tech) + "</div>" : "")) +
          (pr.description ? '<p class="cv-item-desc">' + esc(pr.description) + "</p>" : "") +
          (pr.url ? '<p class="cv-item-desc"><a href="' + esc(pr.url) + '">' + esc(pr.url) + "</a></p>" : "") +
          "</div>";
      }).join("");
      return '<section class="cv-section">' + h + "</section>";
    }
    if (key === "certifications" && r.certifications.length) {
      h += sectionHeading(t, "Certifications");
      h += r.certifications.map(function (c) {
        return '<div class="cv-item">' +
          '<div class="cv-item-head"><span class="cv-item-title">' + esc(c.name) + '</span><span class="cv-item-date">' + esc(fmtDate(c.issueDate)) + (c.expiryDate ? " – " + esc(fmtDate(c.expiryDate)) : "") + "</span></div>" +
          '<div class="cv-item-sub">' + esc(c.org) + (c.credentialId ? " • ID: " + esc(c.credentialId) : "") + "</div>" +
          (c.url ? '<p class="cv-item-desc"><a href="' + esc(c.url) + '">' + esc(c.url) + "</a></p>" : "") +
          "</div>";
      }).join("");
      return '<section class="cv-section">' + h + "</section>";
    }
    if (key === "languages" && r.languages.length) {
      h += sectionHeading(t, "Languages");
      h += '<p class="cv-skill-line">' + r.languages.map(function (l) {
        return esc(l.name) + (l.level ? " (" + esc(l.level) + ")" : "");
      }).join(" &nbsp;•&nbsp; ") + "</p>";
      return '<section class="cv-section">' + h + "</section>";
    }
    if (key === "custom") {
      return r.customSections.map(function (cs) {
        return '<section class="cv-section">' + sectionHeading(t, cs.title) + '<p class="cv-summary">' + esc(cs.content) + "</p></section>";
      }).join("");
    }
    return "";
  }

  function render(resume, opts) {
    opts = opts || {};
    var t = template(resume.templateId);
    var d = resume.design || {};
    /* effective config: design overrides win over the template defaults */
    var eff = {
      layout: d.layout || t.layout,
      header: d.header || t.header,
      font: d.font || t.font,
      accent: d.accent || t.accent,
      skill: d.skill || t.skill,
      divider: d.divider || t.divider,
      photo: d.photo || t.photo,
      heading: d.heading || t.heading
    };
    var accent = eff.accent;
    var font = eff.font;
    var hidden = resume.hiddenSections || [];
    var order = (resume.sectionOrder && resume.sectionOrder.length ? resume.sectionOrder :
      ["summary", "experience", "education", "skills", "projects", "certifications", "languages", "custom"]);

    var doc = document.createElement("div");
    doc.className = "cv-doc layout-" + eff.layout + " header-" + eff.header + " font-" + font +
      " skill-" + eff.skill + " divider-" + eff.divider + " heading-" + eff.heading;
    doc.style.setProperty("--cv-accent", accent);
    doc.style.setProperty("--cv-bg", d.bg || "#ffffff");
    doc.style.setProperty("--cv-sidebar-bg", d.sidebar || "#f1f5f9");
    doc.style.setProperty("--cv-name-size", (d.nameSize || 28) + "px");
    doc.style.setProperty("--cv-body-size", (d.bodySize || 11) + "pt");
    doc.style.setProperty("--cv-line-height", d.lineHeight || 1.5);
    doc.style.setProperty("--cv-margin", (d.margin != null ? d.margin : 18) + "mm");
    doc.style.setProperty("--cv-spacing", (d.spacing != null ? d.spacing : 10) + "px");
    if (opts.forPrint) doc.classList.add("for-print");

    var p = resume.personal || {};
    var photoHtml = "";
    if (p.photo && eff.photo !== "none") {
      photoHtml = '<img class="cv-photo photo-' + eff.photo + '" src="' + esc(p.photo) + '" alt="">';
    }

    var headerHtml = "";
    if (eff.header === "banner") {
      headerHtml = '<header class="cv-header"><div class="cv-head-main">' + photoHtml +
        '<div><h1 class="cv-name">' + esc(p.fullName || "Your Name") + '</h1>' +
        '<p class="cv-title">' + esc(p.title || "Professional Title") + "</p></div></div>" +
        '<p class="cv-contact">' + contactLine(p) + "</p></header>";
    } else if (eff.header === "split") {
      headerHtml = '<header class="cv-header"><div class="cv-head-split"><div>' + photoHtml +
        '<h1 class="cv-name">' + esc(p.fullName || "Your Name") + '</h1>' +
        '<p class="cv-title">' + esc(p.title || "Professional Title") + "</p></div>" +
        '<p class="cv-contact cv-contact-right">' + contactLine(p) + "</p></div></header>";
    } else {
      headerHtml = '<header class="cv-header"><div class="cv-head-main">' + photoHtml +
        '<div><h1 class="cv-name">' + esc(p.fullName || "Your Name") + '</h1>' +
        '<p class="cv-title">' + esc(p.title || "Professional Title") + "</p>" +
        '<p class="cv-contact">' + contactLine(p) + "</p></div></div></header>";
    }

    /* sidebar sections for side-l / side-r layouts */
    var sideKeys = ["skills", "languages", "certifications"];
    var mainKeys = order.filter(function (k) { return sideKeys.indexOf(k) === -1 && hidden.indexOf(k) === -1; });
    var sideHtml = "";
    if (eff.layout === "side-l" || eff.layout === "side-r") {
      sideHtml = '<aside class="cv-sidebar">' +
        '<div class="cv-side-contact"><h3 class="cv-side-h">Contact</h3><p>' + contactLine(p) + "</p></div>" +
        order.filter(function (k) { return sideKeys.indexOf(k) !== -1 && hidden.indexOf(k) === -1; })
          .map(function (k) { return sectionHtml(eff, k, resume); }).join("") +
        "</aside>";
    }
    var mainHtml = order.filter(function (k) { return hidden.indexOf(k) === -1; })
      .filter(function (k) {
        return !((eff.layout === "side-l" || eff.layout === "side-r") && sideKeys.indexOf(k) !== -1);
      })
      .map(function (k) { return sectionHtml(eff, k, resume); }).join("");

    var bodyHtml;
    if (eff.layout === "side-l") {
      bodyHtml = '<div class="cv-body">' + sideHtml + '<div class="cv-main">' + mainHtml + "</div></div>";
    } else if (eff.layout === "side-r") {
      bodyHtml = '<div class="cv-body"><div class="cv-main">' + mainHtml + "</div>" + sideHtml + "</div>";
    } else if (eff.layout === "two-col") {
      var leftKeys = ["experience", "projects"];
      var rightKeys = order.filter(function (k) { return leftKeys.indexOf(k) === -1 && hidden.indexOf(k) === -1; });
      var leftHtml = order.filter(function (k) { return leftKeys.indexOf(k) !== -1 && hidden.indexOf(k) === -1; })
        .map(function (k) { return sectionHtml(eff, k, resume); }).join("");
      var rightHtml = rightKeys.map(function (k) { return sectionHtml(eff, k, resume); }).join("");
      bodyHtml = '<div class="cv-body cv-two-col"><div class="cv-main">' + leftHtml + '</div><div class="cv-rail">' + rightHtml + "</div></div>";
    } else {
      bodyHtml = '<div class="cv-body"><div class="cv-main">' + mainHtml + "</div></div>";
    }

    doc.innerHTML = headerHtml + bodyHtml;
    return doc;
  }

  /* Miniature preview for template cards — renders the sample resume with
     the template, scaled down. It IS the real render, just small. */
  function thumbnail(templateId) {
    var sample = window.CvoraSampleResume ? window.CvoraSampleResume() : window.CvoraBlankResume();
    sample.templateId = templateId;
    var holder = document.createElement("div");
    holder.className = "cv-thumb-holder";
    var doc = render(sample, {});
    doc.classList.add("cv-thumb");
    holder.appendChild(doc);
    return holder;
  }

  window.CvoraRender = { render: render, thumbnail: thumbnail, template: template, esc: esc };
})();
