/* ============================================================
   Admin panel (phone-first): app upload / edit / delete
   ============================================================ */
"use strict";
const Admin = {
  mount(root, o) {
    o = o || {}; const B = window.Backend, U = window.BackendUtil, CFG = window.STORE_CONFIG || {};
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
    const st = {user: null, apps: [], tab: "list", edit: null, busy: false, msg: "", wired: false};
    let alive = true, unwatch = null;
    root.classList.add("ad-root");
    const toast = (m, bad) => { let t = root.querySelector(".ad-toast"); if (!t) { t = document.createElement("div"); t.className = "ad-toast glass"; root.appendChild(t); } t.textContent = m; t.classList.toggle("bad", !!bad); t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), bad ? 4500 : 2200); };
    const confirmBox = (title, text, okLabel) => new Promise((res) => {
      const d = document.createElement("div"); d.className = "ad-modal"; d.innerHTML = `<div class="glass ad-dlg"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="ad-row"><button class="btn" data-r="0">Cancel</button><button class="btn danger" data-r="1">${esc(okLabel || "Delete")}</button></div></div>`;
      d.onclick = (e) => { const b = e.target.closest("button"); if (b || e.target === d) { d.remove(); res(b && b.dataset.r === "1"); } }; root.appendChild(d);
    });
    /* ---------------- screens ---------------- */
    function render() {
      if (!alive) return; const u = st.user;
      if (!u) return renderLogin();
      if (!u.isAdmin) return renderDenied();
      const tabs = [["list", "My apps (" + st.apps.length + ")"], ["edit", st.edit && st.edit.orig ? "Edit app" : "+ Add app"], ["set", "Settings"]];
      root.innerHTML = `<header class="ad-head glass"><div><b>Admin panel</b><small>${esc(u.name)} · ${B.mode === "local" ? "demo mode" : "live"}</small></div><div class="ad-row"><button class="btn" id="adStore">← Store</button><button class="btn" id="adOut">Sign out</button></div></header>
      <nav class="ad-tabs">${tabs.map(t => `<button data-t="${t[0]}" class="${st.tab === t[0] ? "on" : ""}">${esc(t[1])}</button>`).join("")}</nav>
      <main class="ad-main" id="adMain"></main>`;
      root.querySelector("#adStore").onclick = () => { if (o.onExit) o.onExit(); else location.href = "./"; };
      root.querySelector("#adOut").onclick = () => B.signOut();
      root.querySelectorAll(".ad-tabs button").forEach(b => b.onclick = () => { if (b.dataset.t === "edit" && !st.edit) st.edit = newDraft(); st.tab = b.dataset.t; render(); });
      const m = root.querySelector("#adMain"); if (st.tab === "list") renderList(m); else if (st.tab === "edit") renderForm(m); else renderSettings(m);
    }
    function renderLogin() {
      root.innerHTML = `<div class="av-wrap" id="adAuth"></div>`;
      AuthView.mount(root.querySelector("#adAuth"), {title: "Admin login", sub: "Admin account diye log in koro.", noProgress: true, allowGuest: false, onSuccess: () => {}});
      if (o.onExit) { const b = document.createElement("button"); b.className = "btn ad-back"; b.textContent = "← Store"; b.onclick = o.onExit; root.appendChild(b); }
    }
    function renderDenied() {
      const u = st.user;
      root.innerHTML = `<div class="av-wrap"><div class="av-card glass"><h1 class="av-title">Admin access nei</h1>
      <p class="av-sub">Tumi <b>${esc(u.email)}</b> diye log in korecho, kintu ei account ta ekhono admin na.</p>
      <ol class="ad-steps"><li>Firebase Console → <b>Firestore Database</b> kholo.</li><li><b>Start collection</b> → Collection ID: <code>admins</code></li><li>Document ID te nicher UID ta paste koro. Field: <code>ok</code> = <code>true</code> → Save.</li><li>Ei page reload koro.</li></ol>
      <div class="ad-uid"><code id="adUid">${esc(u.uid)}</code><button class="btn" id="adCopy">Copy UID</button></div>
      <div class="ad-row" style="margin-top:14px"><button class="btn" id="adStore">← Store</button><button class="btn" id="adOut">Sign out</button></div></div></div>`;
      root.querySelector("#adCopy").onclick = async () => { try { await navigator.clipboard.writeText(u.uid); toast("UID copy hoyeche"); } catch (e) { const r = document.createRange(); r.selectNode(root.querySelector("#adUid")); getSelection().removeAllRanges(); getSelection().addRange(r); toast("UID select kora hoyeche, copy koro"); } };
      root.querySelector("#adStore").onclick = () => { if (o.onExit) o.onExit(); else location.href = "./"; };
      root.querySelector("#adOut").onclick = () => B.signOut();
    }
    function renderList(m) {
      const L = st.apps.slice().sort((a, b) => (b.order || 0) - (a.order || 0));
      m.innerHTML = L.length ? L.map(a => `<div class="ad-app glass"><img src="${esc(a.icon)}" alt=""><div class="ad-info"><b>${esc(a.name)}</b><span>v${esc(a.version)} · ${esc(a.size || "?")} · ${esc(a.category || "")}</span><span class="ad-mut">${a.apk ? "APK ✓" : "APK nei"}${a.featured ? " · ★ featured" : ""}</span></div><div class="ad-col"><button class="btn" data-e="${esc(a.id)}">Edit</button><button class="btn danger" data-d="${esc(a.id)}">Delete</button></div></div>`).join("")
        : `<div class="ad-empty glass"><p>Ekhono kono app nei.</p><button class="btn main" id="adFirst">+ Prothom app add koro</button></div>`;
      const f = m.querySelector("#adFirst"); if (f) f.onclick = () => { st.edit = newDraft(); st.tab = "edit"; render(); };
      m.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { const a = st.apps.find(x => x.id === b.dataset.e); st.edit = draftFrom(a); st.tab = "edit"; render(); loadShots(); });
      m.querySelectorAll("[data-d]").forEach(b => b.onclick = async () => {
        const a = st.apps.find(x => x.id === b.dataset.d); if (!a) return;
        if (!await confirmBox("Delete \"" + a.name + "\"?", "App ta store theke muche jabe." + (a.apkMeta && a.apkMeta.provider !== "demo" ? " APK file o muche felbo." : ""), "Delete")) return;
        try { let note = ""; try { await B.deleteApk(a.apkMeta); } catch (e) { note = " (APK file nije muchte hobe: " + e.message + ")"; } await B.deleteApp(a.id); toast("Deleted" + note, !!note); } catch (e) { toast(e.message, true); }
      });
    }
    /* ---------------- add / edit form ---------------- */
    const today = () => new Date().toISOString().slice(0, 10);
    function newDraft() { return {orig: null, id: "", name: "", tagline: "", category: "Tools", description: "", version: "1.0.0", size: "", android: "Android 7.0+", rating: "4.5", downloads: "100+", price: "Free", developer: (st.user && st.user.name) || CFG.storeName || "", package: "", featured: false, color: "#2f7d5b", colorSet: false, icon: "", shots: [], shotsChanged: false, whatsNew: "First release", permissions: "Internet", provider: (B.apkProviders()[0] || {}).id, file: null, link: "", apk: "", apkMeta: null}; }
    function draftFrom(a) { return Object.assign(newDraft(), {orig: a, id: a.id, name: a.name || "", tagline: a.tagline || "", category: a.category || "", description: a.description || "", version: a.version || "", size: a.size || "", android: a.android || "", rating: a.rating == null ? "" : String(a.rating), downloads: a.downloads || "", price: a.price || "Free", developer: a.developer || "", package: a.package || "", featured: !!a.featured, color: a.color || "#2f7d5b", colorSet: true, icon: a.icon || "", shots: (a.screenshots || []).slice(), whatsNew: (a.whatsNew || []).join("\n"), permissions: (a.permissions || []).join(", "), apk: a.apk || "", apkMeta: a.apkMeta || null, shotsLoaded: !!a.screenshots}); }
    async function loadShots() { const d = st.edit; if (!d || !d.orig || d.shotsLoaded) return; const s = await B.getShots(d.id); if (st.edit === d) { d.shots = s; d.shotsLoaded = true; if (st.tab === "edit") paintShots(); } }
    function paintShots() { const e = root.querySelector("#adShots"); if (!e) return; const d = st.edit; e.innerHTML = d.shots.map((s, i) => `<div class="ad-th"><img src="${esc(s)}" alt=""><button type="button" data-x="${i}">×</button></div>`).join("") + (d.shots.length < 5 ? `<label class="ad-add">＋<input type="file" accept="image/*" multiple hidden id="adShotIn"></label>` : "");
      e.querySelectorAll("[data-x]").forEach(b => b.onclick = () => { d.shots.splice(+b.dataset.x, 1); d.shotsChanged = true; paintShots(); });
      const inp = e.querySelector("#adShotIn"); if (inp) inp.onchange = async () => { for (const f of [...inp.files].slice(0, 5 - d.shots.length)) { try { d.shots.push(await U.resizeImage(f, 640, .72, "image/jpeg")); d.shotsChanged = true; } catch (er) { toast(er.message, true); } } paintShots(); }; }
    function renderForm(m) {
      if (!st.edit) st.edit = newDraft(); const d = st.edit, provs = B.apkProviders(), cats = [...new Set(st.apps.map(a => a.category).filter(Boolean).concat(["Tools", "Games", "Social", "Productivity", "Business", "Education", "Music", "Photography", "Lifestyle"]))];
      const f = (id, label, val, extra) => `<label class="ad-f"><span>${label}</span><input id="${id}" value="${esc(val)}" ${extra || ""}></label>`;
      m.innerHTML = `<form class="ad-form" id="adForm" novalidate>
        <div class="ad-card glass"><h3>${d.orig ? "Edit: " + esc(d.orig.name) : "Notun app"}</h3>
          <div class="ad-iconrow"><label class="ad-icon" id="adIconBox">${d.icon ? `<img src="${esc(d.icon)}" alt="">` : "<span>App icon<br><small>(square image)</small></span>"}<input type="file" accept="image/*" hidden id="adIconIn"></label>
          <div class="ad-grow">${f("fName", "App er naam *", d.name, 'maxlength="40"')}${f("fTag", "Choto tagline", d.tagline, 'maxlength="70"')}</div></div>
          <div class="ad-two"><label class="ad-f"><span>Category</span><input id="fCat" list="adCats" value="${esc(d.category)}"><datalist id="adCats">${cats.map(c => `<option value="${esc(c)}">`).join("")}</datalist></label>${f("fVer", "Version *", d.version, 'placeholder="1.0.0"')}</div>
          <label class="ad-f"><span>Description</span><textarea id="fDesc" rows="4">${esc(d.description)}</textarea></label>
          <label class="ad-f"><span>What's new (ek line e ekta)</span><textarea id="fNew" rows="3">${esc(d.whatsNew)}</textarea></label></div>
        <div class="ad-card glass"><h3>Screenshots <small>(max 5)</small></h3><div class="ad-shots" id="adShots"></div></div>
        <div class="ad-card glass"><h3>APK file</h3>
          ${d.apk ? `<p class="ad-mut">Ekhon: <a href="${esc(d.apk)}" target="_blank" rel="noopener">${esc(d.apk.length > 50 ? d.apk.slice(0, 47) + "…" : d.apk)}</a><br>Notun file dile purono ta replace hobe.</p>` : ""}
          <div class="ad-seg" id="adProv">${provs.map(p => `<button type="button" data-p="${p.id}" class="${d.provider === p.id ? "on" : ""}">${esc(p.label)}</button>`).join("")}</div>
          <div id="adApkBox"></div><div class="ad-two">${f("fSize", "Size (auto)", d.size, 'placeholder="12 MB"')}${f("fAnd", "Android", d.android)}</div></div>
        <div class="ad-card glass"><h3>Aro details <small>(optional)</small></h3>
          <div class="ad-two">${f("fDev", "Developer", d.developer)}${f("fPkg", "Package", d.package, 'placeholder="com.you.app"')}</div>
          <div class="ad-two">${f("fRate", "Rating (1-5)", d.rating, 'inputmode="decimal"')}${f("fDl", "Downloads", d.downloads)}</div>
          <div class="ad-two">${f("fPrice", "Price", d.price)}<label class="ad-f"><span>Tile er rong</span><input id="fColor" type="color" value="${esc(d.color)}"></label></div>
          ${f("fPerm", "Permissions (comma diye)", d.permissions)}
          <label class="ad-chk"><input type="checkbox" id="fFeat" ${d.featured ? "checked" : ""}> <span>★ Featured app</span></label></div>
        <div class="ad-prog" id="adProg" hidden><i></i><span></span></div>
        <div class="ad-save"><button type="button" class="btn" id="adCancel">Cancel</button><button type="submit" class="btn main" id="adSave">${d.orig ? "Save changes" : "Publish app"}</button></div></form>`;
      const q = (s) => m.querySelector(s); paintShots(); paintApk();
      const sync = () => { d.name = q("#fName").value; d.tagline = q("#fTag").value; d.category = q("#fCat").value; d.version = q("#fVer").value; d.description = q("#fDesc").value; d.whatsNew = q("#fNew").value; d.size = q("#fSize").value; d.android = q("#fAnd").value; d.developer = q("#fDev").value; d.package = q("#fPkg").value; d.rating = q("#fRate").value; d.downloads = q("#fDl").value; d.price = q("#fPrice").value; d.permissions = q("#fPerm").value; d.featured = q("#fFeat").checked; d.color = q("#fColor").value; const l = q("#fLink"); if (l) d.link = l.value; };
      m.oninput = sync; q("#fColor").addEventListener("input", () => { d.colorSet = true; });
      q("#adIconIn").onchange = async (e) => { const fl = e.target.files[0]; if (!fl) return; try { d.icon = await U.resizeImage(fl, 192, .9); if (!d.colorSet) d.color = await U.dominantColor(d.icon); sync(); renderForm(m); } catch (er) { toast(er.message, true); } };
      q("#adProv").querySelectorAll("button").forEach(b => b.onclick = () => { sync(); d.provider = b.dataset.p; q("#adProv").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); paintApk(); });
      function paintApk() {
        const box = q("#adApkBox"); if (!box) return; const p = d.provider;
        if (p === "link") box.innerHTML = `<label class="ad-f"><span>APK direct link (https://…)</span><input id="fLink" value="${esc(d.link)}" inputmode="url" placeholder="https://github.com/…/app.apk"></label>`;
        else box.innerHTML = `<label class="ad-file"><input type="file" id="fFile" hidden accept=".apk,application/vnd.android.package-archive,application/octet-stream"><span>${d.file ? "📦 " + esc(d.file.name) + " (" + U.fmtSize(d.file.size) + ")" : "📁 APK file select koro"}</span></label>${p === "github" ? githubHint() : ""}`;
        const fi = box.querySelector("#fFile"); if (fi) fi.onchange = () => { const fl = fi.files[0]; if (!fl) return; d.file = fl; d.size = U.fmtSize(fl.size); q("#fSize").value = d.size; paintApk(); };
        const l = box.querySelector("#fLink"); if (l) l.oninput = () => { d.link = l.value; };
      }
      function githubHint() { const s = U.GH.settings(); return s.token && s.owner && s.repo ? `<p class="ad-mut">GitHub: ${esc(s.owner)}/${esc(s.repo)} ✓</p>` : `<p class="ad-warn">Age <b>Settings</b> tab e GitHub token + repo dao.</p>`; }
      q("#adCancel").onclick = () => { st.edit = null; st.tab = "list"; render(); };
      q("#adForm").onsubmit = async (e) => { e.preventDefault(); sync(); if (!st.busy) save(d, q); };
    }
    async function save(d, q) {
      const name = d.name.trim(), ver = d.version.trim(); if (!name) return toast("App er naam likho", true); if (!ver) return toast("Version likho", true); if (!d.icon) return toast("Icon image dao", true);
      const needApk = !d.apk && !d.file && !(d.provider === "link" && d.link.trim()); if (needApk) return toast("APK file select koro ba link dao", true);
      if (d.provider === "link" && d.link.trim() && !/^https?:\/\//i.test(d.link.trim()) && d.link.trim() !== "#") return toast("Link https:// diye shuru hote hobe", true);
      st.busy = true; const btn = q("#adSave"), prog = q("#adProg"), bar = prog.querySelector("i"), txt = prog.querySelector("span"); btn.disabled = true; btn.textContent = "Saving…"; prog.hidden = false; bar.style.width = "3%"; txt.textContent = "Shuru hocche…";
      try {
        let id = d.id; if (!id) { const base = U.slug(name); id = base; let n = 2; while (st.apps.some(a => a.id === id)) id = base + "-" + n++; }
        let apk = d.apk, apkMeta = d.apkMeta, oldMeta = null;
        if (d.provider === "link" && d.link.trim() && !d.file) { oldMeta = d.apkMeta; apk = d.link.trim(); apkMeta = {provider: "link"}; }
        if (d.file && d.provider !== "link") { txt.textContent = "APK upload hocche…"; const r = await B.uploadApk(d.file, {id, name, version: ver, provider: d.provider, fileName: d.file.name}, (p) => { bar.style.width = Math.max(4, Math.round(p * 95)) + "%"; txt.textContent = "APK upload " + Math.round(p * 100) + "%"; }); oldMeta = d.apkMeta; apk = r.url; apkMeta = r.meta; }
        txt.textContent = "Save hocche…"; bar.style.width = "97%";
        const app = {id, name, tagline: d.tagline.trim(), category: d.category.trim() || "Tools", description: d.description.trim(), version: ver, size: d.size.trim(), android: d.android.trim(), updated: today(), rating: parseFloat(d.rating) || 0, ratingCount: (d.orig && d.orig.ratingCount) || 0, downloads: d.downloads.trim(), price: d.price.trim() || "Free", developer: d.developer.trim(), package: d.package.trim(), featured: !!d.featured, color: d.color, icon: d.icon, whatsNew: d.whatsNew.split("\n").map(s => s.trim()).filter(Boolean), permissions: d.permissions.split(",").map(s => s.trim()).filter(Boolean), apk, apkMeta: apkMeta || null, order: (d.orig && d.orig.order) || Date.now()};
        await B.saveApp(app, d.shotsChanged || !d.orig ? d.shots : null);
        if (oldMeta && oldMeta.provider !== "link" && oldMeta.provider !== "demo" && JSON.stringify(oldMeta) !== JSON.stringify(apkMeta)) { try { await B.deleteApk(oldMeta); } catch (e) {} }
        bar.style.width = "100%"; toast(d.orig ? "Update hoyeche ✓" : "App publish hoyeche ✓"); st.edit = null; st.tab = "list";
      } catch (e) { toast(e.message || String(e), true); st.busy = false; btn.disabled = false; btn.textContent = d.orig ? "Save changes" : "Publish app"; prog.hidden = true; return; }
      st.busy = false; render();
    }
    /* ---------------- settings ---------------- */
    function renderSettings(m) {
      const s = U.GH.settings();
      m.innerHTML = `<div class="ad-card glass"><h3>GitHub (APK upload er jonno)</h3><p class="ad-mut">APK file GitHub Releases e jabe (free, boro file o cholbe). Token ei phone e-i thakbe, kothao pathano hobe na.</p>
        <label class="ad-f"><span>GitHub username</span><input id="sOwner" value="${esc(s.owner)}" autocapitalize="off"></label>
        <label class="ad-f"><span>Repo name</span><input id="sRepo" value="${esc(s.repo)}" autocapitalize="off"></label>
        <label class="ad-f"><span>Personal access token</span><input id="sTok" type="password" value="${esc(s.token)}" autocomplete="off" placeholder="github_pat_…"></label>
        <div class="ad-row"><button class="btn" id="sTest">Test</button><button class="btn main" id="sSave">Save</button></div><p id="sRes" class="ad-mut"></p>
        <details><summary>Token kibhabe banabo?</summary><ol class="ad-steps"><li>GitHub → profile photo → <b>Settings</b> → <b>Developer settings</b> → <b>Personal access tokens → Fine-grained tokens</b> → <b>Generate new token</b>.</li><li>Repository access: <b>Only select repositories</b> → tomar store repo.</li><li>Permissions → <b>Contents: Read and write</b>.</li><li>Generate → token copy kore ekhane paste koro.</li></ol></details></div>
      <div class="ad-card glass"><h3>Account</h3><p class="ad-mut">Mode: <b>${B.mode === "local" ? "Demo (data ei browser e)" : "Firebase (live)"}</b><br>Email: ${esc(st.user.email)}<br>UID: <code>${esc(st.user.uid)}</code></p></div>`;
      const q = (x) => m.querySelector(x), get = () => ({owner: q("#sOwner").value.trim(), repo: q("#sRepo").value.trim(), token: q("#sTok").value.trim()});
      q("#sSave").onclick = () => { U.GH.save(get()); toast("Saved ✓"); };
      q("#sTest").onclick = async () => { const v = get(); q("#sRes").textContent = "Checking…"; try { const r = await U.GH.api(`/repos/${v.owner}/${v.repo}`, "GET", v.token); q("#sRes").textContent = r.permissions && r.permissions.push ? "✓ Thik ache: " + r.full_name + " (upload kora jabe)" : "⚠ Repo paoya gelo kintu write permission nei."; } catch (e) { q("#sRes").textContent = "✗ " + e.message; } };
    }
    /* ---------------- boot ---------------- */
    B.onAuth((u) => { if (!alive) return; st.user = u; if (u && u.isAdmin && !unwatch) unwatch = B.watchApps((l) => { st.apps = l; if (alive && st.user && st.user.isAdmin && st.tab === "list") render(); }); if (!u && unwatch) { try { unwatch(); } catch (e) {} unwatch = null; } st.tab = "list"; st.edit = null; render(); });
    return {destroy() { alive = false; if (unwatch) try { unwatch(); } catch (e) {} root.innerHTML = ""; }};
  }
};
