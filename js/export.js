/* CVora export — PDF (via print), PNG, JPG, TXT, standalone HTML and JSON.
   PNG/JPG rasterize the real CV document with SVG foreignObject + canvas.
   Note: web fonts fall back to system fonts inside the rasterized image,
   because browsers block external font loads in SVG-as-image. */
(function () {
  "use strict";

  var store = window.CvoraStore;

  function slug(s) {
    return String(s || "cv").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "cv";
  }
  function fileName(resume, ext) {
    var base = slug((resume.personal && resume.personal.fullName) || resume.title || "cv");
    return base + "-cv." + ext;
  }
  function downloadBlob(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function downloadText(text, name, type) {
    downloadBlob(new Blob([text], { type: type || "text/plain" }), name);
  }

  /* ---------------- CSS for standalone/raster exports ---------------- */
  function getCssText() {
    return fetch("css/templates.css").then(function (r) { return r.text(); }).catch(function () {
      var css = "";
      try {
        for (var i = 0; i < document.styleSheets.length; i++) {
          var sheet = document.styleSheets[i];
          try {
            var rules = sheet.cssRules;
            for (var j = 0; j < rules.length; j++) css += rules[j].cssText + "\n";
          } catch (e) { /* cross-origin sheet, skip */ }
        }
      } catch (e) { /* ignore */ }
      return css;
    });
  }

  /* ---------------- PNG / JPG ---------------- */
  function renderToImage(resume, mime, done) {
    var holder = document.createElement("div");
    holder.style.cssText = "position:absolute;left:-99999px;top:0;";
    document.body.appendChild(holder);
    var doc = window.CvoraRender.render(resume, { forPrint: true });
    doc.style.width = "794px";
    holder.appendChild(doc);
    var height = doc.offsetHeight || 1123;
    getCssText().then(function (css) {
      var xhtml = new XMLSerializer().serializeToString(doc);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="794" height="' + height + '">' +
        '<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>' +
        css.replace(/<\/style>/g, "") +
        '</style>' + xhtml + "</div></foreignObject></svg>";
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(2, 6000 / height);
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(794 * scale);
        canvas.height = Math.round(height * scale);
        var ctx = canvas.getContext("2d");
        if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        holder.remove();
        canvas.toBlob(function (blob) { done(blob); }, mime, 0.92);
      };
      img.onerror = function () {
        holder.remove();
        done(null);
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  function exportImage(resume, kind) {
    var mime = kind === "jpg" ? "image/jpeg" : "image/png";
    window.CvoraApp.toast("Rendering " + kind.toUpperCase() + " image…");
    renderToImage(resume, mime, function (blob) {
      if (!blob) { window.CvoraApp.toast("Image export failed in this browser — try PDF instead."); return; }
      downloadBlob(blob, fileName(resume, kind));
      store.recordDownload();
      window.CvoraApp.toast(kind.toUpperCase() + " downloaded. Note: web fonts fall back to system fonts in the image.");
    });
  }

  /* ---------------- TXT ---------------- */
  function toTxt(r) {
    var p = r.personal || {};
    var lines = [];
    lines.push((p.fullName || "Your Name").toUpperCase());
    lines.push(p.title || "");
    lines.push([p.email, p.phone, [p.city, p.country].filter(Boolean).join(", ")].filter(Boolean).join(" | "));
    lines.push("");
    if (r.summary) { lines.push("PROFESSIONAL SUMMARY"); lines.push(r.summary); lines.push(""); }
    function section(title, items, fmt) {
      if (!items.length) return;
      lines.push(title.toUpperCase());
      items.forEach(function (it) { lines.push(fmt(it)); lines.push(""); });
    }
    section("Work Experience", r.experience, function (j) {
      var s = j.jobTitle + " — " + j.company + (j.location ? ", " + j.location : "") + "\n" +
        [j.start, j.current ? "Present" : j.end].filter(Boolean).join(" – ");
      if (j.description) s += "\n" + j.description;
      (j.bullets || []).filter(Boolean).forEach(function (b) { s += "\n• " + b; });
      return s;
    });
    section("Education", r.education, function (e) {
      return e.degree + " — " + e.institution + (e.field ? " (" + e.field + ")" : "") + "\n" +
        [e.startYear, e.current ? "Present" : e.endYear].filter(Boolean).join(" – ") + (e.gpa ? " • GPA " + e.gpa : "");
    });
    if (r.skills.length) {
      lines.push("SKILLS");
      lines.push(r.skills.map(function (s) { return s.name; }).join(", "));
      lines.push("");
    }
    section("Projects", r.projects, function (pr) {
      return pr.name + (pr.role ? " — " + pr.role : "") + "\n" + (pr.description || "") + (pr.tech ? "\nTech: " + pr.tech : "");
    });
    section("Certifications", r.certifications, function (c) {
      return c.name + " — " + c.org + (c.issueDate ? " (" + c.issueDate + ")" : "");
    });
    if (r.languages.length) {
      lines.push("LANGUAGES");
      lines.push(r.languages.map(function (l) { return l.name + (l.level ? " (" + l.level + ")" : ""); }).join(", "));
      lines.push("");
    }
    r.customSections.forEach(function (cs) {
      lines.push(cs.title.toUpperCase());
      lines.push(cs.content);
      lines.push("");
    });
    return lines.join("\n");
  }

  /* ---------------- standalone HTML ---------------- */
  function toHtml(r) {
    var doc = window.CvoraRender.render(r, { forPrint: true });
    return getCssText().then(function (css) {
      var title = (r.personal && r.personal.fullName) || r.title || "CV";
      return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<title>" +
        window.CvoraRender.esc(title) + " — CV</title>\n<style>\n" + css +
        "\nbody{background:#f1f5f9;margin:0;padding:24px}\n</style>\n</head>\n<body>\n" +
        doc.outerHTML + "\n</body>\n</html>";
    });
  }

  /* ---------------- JSON ---------------- */
  function toJson(r) {
    return JSON.stringify(r, null, 2);
  }
  function importJsonFile(file, done) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data || typeof data !== "object" || !data.personal) throw new Error("not a CVora resume");
        data.id = "cv-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);
        data.title = (data.title || "Imported CV") + " (imported)";
        data.createdAt = new Date().toISOString();
        store.saveResume(data);
        done({ ok: true, resume: data });
      } catch (e) {
        done({ ok: false, error: "That file is not a CVora resume JSON." });
      }
    };
    reader.readAsText(file);
  }

  window.CvoraExport = {
    exportImage: exportImage,
    toTxt: toTxt,
    toHtml: toHtml,
    toJson: toJson,
    importJsonFile: importJsonFile,
    downloadText: downloadText,
    downloadBlob: downloadBlob,
    fileName: fileName
  };
})();
