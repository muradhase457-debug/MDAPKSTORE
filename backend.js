/* ============================================================
   Backend: Firebase (real) ba Local (demo) — dutoi ek-i API
   ============================================================ */
"use strict";
(function () {
  const CFG = window.STORE_CONFIG || (window.STORE_CONFIG = {});
  const FBC = CFG.firebase || {};
  const HAS_FB = !!(FBC.apiKey && FBC.projectId) && !window.__PREVIEW;
  const FB_VER = "10.14.1";
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "app";
  const fmtSize = (b) => b >= 1048576 ? (b / 1048576).toFixed(b >= 10485760 ? 0 : 1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";

  /* ---- friendly error text ---- */
  const ERR = {
    "auth/invalid-email": "Email ta thik na.", "auth/user-not-found": "Ei email e kono account nei.", "auth/wrong-password": "Password vul.",
    "auth/invalid-credential": "Email ba password vul.", "auth/email-already-in-use": "Ei email diye age account khola hoyeche. Log in koro.",
    "auth/weak-password": "Password kombesh 6 akkhor hote hobe.", "auth/network-request-failed": "Internet connection nei ba dhire. Abar try koro.",
    "auth/too-many-requests": "Onek bar vul hoyeche. Kichukkhon pore try koro.", "auth/popup-closed-by-user": "Google window bondho hoye gelo.",
    "auth/operation-not-allowed": "Firebase e ei login poddhoti chalu kora nei (Authentication → Sign-in method).", "auth/missing-password": "Password likho.",
    "auth/unauthorized-domain": "Ei domain Firebase e allow kora nei (Authentication → Settings → Authorized domains).",
    "permission-denied": "Permission nei. Firestore rules ar admin setup check koro.", "unavailable": "Server e connect hocche na. Internet check koro."
  };
  const errMsg = (e) => (e && (ERR[e.code] || ERR[(e.code || "").replace("firestore/", "")])) || (e && e.message) || "Kichu ekta vul hoyeche.";

  /* ---- image helper (admin panel) : resize in browser so Firestore doc stays small ---- */
  function resizeImage(file, max, quality, forceType) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej(new Error("File porte parlam na"));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => rej(new Error("Eta image na"));
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
          const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.drawImage(img, 0, 0, w, h);
          let type = forceType || (/png|svg|gif|webp/i.test(file.type) ? "image/webp" : "image/jpeg"), out = c.toDataURL(type, quality);
          if (type === "image/webp" && !/^data:image\/webp/.test(out)) out = c.toDataURL("image/png");
          res(out);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function dominantColor(dataUrl) {
    return new Promise((res) => {
      const img = new Image(); img.onload = () => { try { const c = document.createElement("canvas"); c.width = c.height = 16; const g = c.getContext("2d"); g.drawImage(img, 0, 0, 16, 16); const d = g.getImageData(0, 0, 16, 16).data; let r = 0, gg = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); const w = 1 + (mx - mn) / 40; r += d[i] * w; gg += d[i + 1] * w; b += d[i + 2] * w; n += w; } if (!n) return res("#2f7d5b"); res("#" + [r, gg, b].map(v => Math.round(v / n).toString(16).padStart(2, "0")).join("")); } catch (e) { res("#2f7d5b"); } }; img.onerror = () => res("#2f7d5b"); img.src = dataUrl;
    });
  }

  /* ---- GitHub Releases upload (APK) ---- */
  const GH = {
    settings() { const s = lsGet("apkstore.gh", {}); const c = CFG.github || {}; return {token: s.token || "", owner: s.owner || c.owner || "", repo: s.repo || c.repo || ""}; },
    save(s) { lsSet("apkstore.gh", s); },
    api(path, method, token, body) {
      return fetch("https://api.github.com" + path, {method, headers: Object.assign({"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json"}, body ? {"Content-Type": "application/json"} : {}), body: body ? JSON.stringify(body) : undefined})
        .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(r.status === 401 ? "GitHub token vul ba expire hoye geche." : r.status === 404 ? "GitHub repo/owner paoya jay nai ba token er permission nei." : (j.message || "GitHub error " + r.status)); e.status = r.status; throw e; } return j; });
    },
    async upload(file, info, onProgress) {
      const s = this.settings(); if (!s.token || !s.owner || !s.repo) throw new Error("Admin → Settings e GitHub token, username, repo dao.");
      const safe = (info.fileName || file.name || "app.apk").replace(/[^A-Za-z0-9._-]+/g, "-");
      const tag = (slug(info.id) + "-v" + String(info.version || "1").replace(/[^A-Za-z0-9._-]+/g, "") + "-" + Date.now().toString(36)).slice(0, 80);
      const rel = await this.api(`/repos/${s.owner}/${s.repo}/releases`, "POST", s.token, {tag_name: tag, name: (info.name || info.id) + " " + (info.version || ""), body: "APK uploaded from admin panel", draft: false, prerelease: false});
      const asset = await new Promise((res, rej) => {
        const x = new XMLHttpRequest(); x.open("POST", `https://uploads.github.com/repos/${s.owner}/${s.repo}/releases/${rel.id}/assets?name=${encodeURIComponent(safe)}`);
        x.setRequestHeader("Authorization", "Bearer " + s.token); x.setRequestHeader("Content-Type", "application/vnd.android.package-archive"); x.setRequestHeader("Accept", "application/vnd.github+json");
        x.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
        x.onerror = () => rej(new Error("Upload fail (internet ba GitHub block)."));
        x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch (e) {} if (x.status >= 200 && x.status < 300) res(j); else rej(new Error(j.message || ("Upload fail " + x.status))); };
        x.send(file);
      }).catch(async (e) => { try { await this.api(`/repos/${s.owner}/${s.repo}/releases/${rel.id}`, "DELETE", s.token); } catch (_) {} throw e; });
      return {url: asset.browser_download_url, meta: {provider: "github", owner: s.owner, repo: s.repo, releaseId: rel.id, tag}};
    },
    async remove(meta) {
      const s = this.settings(); if (!meta || !s.token) return false;
      try { await this.api(`/repos/${meta.owner || s.owner}/${meta.repo || s.repo}/releases/${meta.releaseId}`, "DELETE", s.token); } catch (e) { if (e.status !== 404) throw e; }
      try { await this.api(`/repos/${meta.owner || s.owner}/${meta.repo || s.repo}/git/refs/tags/${meta.tag}`, "DELETE", s.token); } catch (e) {}
      return true;
    }
  };

  /* ============================================================
     LOCAL (demo) backend — data thake ei browser e
     ============================================================ */
  class LocalBackend {
    constructor() { this.mode = "local"; this.user = null; this.cbs = []; this.appCbs = []; }
    async init() {
      this.users = lsGet("apkstore.local.users", {}); const uid = lsGet("apkstore.local.session", null);
      let apps = lsGet("apkstore.local.apps", null);
      if (!apps) { let seed = (window.__DATA && window.__DATA.apps) || null; if (!seed) { try { const r = await fetch("apps.json"); seed = (await r.json()).apps || []; } catch (e) { seed = []; } } apps = seed.map((a, i) => Object.assign({}, a, {order: i, id: a.id || slug(a.name)})); lsSet("apkstore.local.apps", apps); }
      this.apps = apps; if (uid && Object.values(this.users).find(u => u.uid === uid)) this.user = this._pub(Object.values(this.users).find(u => u.uid === uid));
    }
    _pub(u) { return {uid: u.uid, email: u.email, name: u.name, isAdmin: true}; }
    onAuth(cb) { this.cbs.push(cb); cb(this.user); }
    _emit() { this.cbs.forEach(f => f(this.user)); }
    async signUp(name, email, pass) {
      email = String(email).trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error(ERR["auth/invalid-email"]); if (String(pass).length < 6) throw new Error(ERR["auth/weak-password"]);
      if (this.users[email]) throw new Error(ERR["auth/email-already-in-use"]);
      const u = this.users[email] = {uid: "u" + Date.now().toString(36), email, name: String(name || email.split("@")[0]).trim(), pass}; lsSet("apkstore.local.users", this.users); lsSet("apkstore.local.session", u.uid); this.user = this._pub(u); this._emit(); return this.user;
    }
    async signIn(email, pass) {
      email = String(email).trim().toLowerCase(); const u = this.users[email]; if (!u) throw new Error(ERR["auth/user-not-found"]); if (u.pass !== pass) throw new Error(ERR["auth/wrong-password"]);
      lsSet("apkstore.local.session", u.uid); this.user = this._pub(u); this._emit(); return this.user;
    }
    async signInGoogle() { throw new Error("Google login Firebase setup er por kaj korbe."); }
    async reset(email) { return "Demo mode: password reset email jay na."; }
    async signOut() { this.user = null; lsSet("apkstore.local.session", null); this._emit(); }
    watchApps(cb) { this.appCbs.push(cb); cb(this.apps.slice()); return () => { this.appCbs = this.appCbs.filter(f => f !== cb); }; }
    _apps() { lsSet("apkstore.local.apps", this.apps); this.appCbs.forEach(f => f(this.apps.slice())); }
    async getShots(id) { const a = this.apps.find(x => x.id === id); return (a && (a.screenshots || a.shots)) || []; }
    async saveApp(app, shots) {
      const a = Object.assign({}, app); if (shots) a.screenshots = shots; else { const o = this.apps.find(x => x.id === a.id); if (o && o.screenshots) a.screenshots = o.screenshots; }
      const i = this.apps.findIndex(x => x.id === a.id); if (i >= 0) this.apps[i] = Object.assign({}, this.apps[i], a); else this.apps.push(a); this._apps(); return a;
    }
    async deleteApp(id) { this.apps = this.apps.filter(x => x.id !== id); this._apps(); }
    async getUserData(uid) { return lsGet("apkstore.local.ud." + uid, {}); }
    async setUserData(uid, patch) { lsSet("apkstore.local.ud." + uid, Object.assign(lsGet("apkstore.local.ud." + uid, {}), patch)); }
    async getReviews(appId) { return (lsGet("apkstore.local.rev", {})[appId] || []).slice(); }
    async addReview(appId, r) { const all = lsGet("apkstore.local.rev", {}), list = (all[appId] || []).filter(x => x.uid !== r.uid); list.unshift(Object.assign({appId}, r)); all[appId] = list; lsSet("apkstore.local.rev", all); }
    async deleteReview(appId, uid) { const all = lsGet("apkstore.local.rev", {}); all[appId] = (all[appId] || []).filter(x => x.uid !== uid); lsSet("apkstore.local.rev", all); }
    async uploadApk(file, info, onProgress) { for (let i = 1; i <= 10; i++) { await new Promise(r => setTimeout(r, 60)); onProgress && onProgress(i / 10); } return {url: "#demo-no-real-apk", meta: {provider: "demo"}}; }
    async deleteApk() { return true; }
    apkProviders() { return [{id: "demo", label: "Demo upload (fake)"}, {id: "link", label: "Paste link"}]; }
  }

  /* ============================================================
     FIREBASE backend
     ============================================================ */
  class FirebaseBackend {
    constructor() { this.mode = "firebase"; this.user = null; this.cbs = []; }
    async init() {
      const base = "https://www.gstatic.com/firebasejs/" + FB_VER + "/";
      const imp = (n) => import(base + "firebase-" + n + ".js");
      const mods = await Promise.all([imp("app"), imp("auth"), imp("firestore")]);
      this.M = Object.assign({}, mods[0], mods[1], mods[2]);
      const M = this.M; this.app = M.initializeApp(FBC); this.auth = M.getAuth(this.app);
      try { this.db = M.initializeFirestore(this.app, {localCache: M.persistentLocalCache({tabManager: M.persistentMultipleTabManager()})}); } catch (e) { this.db = M.getFirestore(this.app); }
      this._ready = new Promise((res) => { this._res = res; });
      M.onAuthStateChanged(this.auth, (u) => { this._fbUser = u; this._refresh().then(() => this._res && (this._res(), this._res = null)); });
      await this._ready;
    }
    async _refresh() {
      const u = this._fbUser, M = this.M;
      if (!u) this.user = null; else {
        const user = {uid: u.uid, email: u.email || "", name: u.displayName || (u.email || "User").split("@")[0], isAdmin: false};
        try { user.isAdmin = (await M.getDoc(M.doc(this.db, "admins", u.uid))).exists(); } catch (e) { user.isAdmin = false; }
        this.user = user;
      }
      this.cbs.forEach(f => f(this.user));
    }
    onAuth(cb) { this.cbs.push(cb); if (this._ready === undefined || !this._res) cb(this.user); }
    async signUp(name, email, pass) {
      const M = this.M; try {
        const c = await M.createUserWithEmailAndPassword(this.auth, String(email).trim(), pass);
        name = String(name || "").trim() || String(email).split("@")[0];
        try { await M.updateProfile(c.user, {displayName: name}); } catch (e) {}
        try { await M.setDoc(M.doc(this.db, "users", c.user.uid), {name, email: String(email).trim(), wish: [], inst: {}, created: Date.now()}, {merge: true}); } catch (e) {}
        this._fbUser = this.auth.currentUser; await this._refresh(); return this.user;
      } catch (e) { throw new Error(errMsg(e)); }
    }
    async signIn(email, pass) { try { await this.M.signInWithEmailAndPassword(this.auth, String(email).trim(), pass); await this._waitUser(); return this.user; } catch (e) { throw new Error(errMsg(e)); } }
    async signInGoogle() { const M = this.M; try { const r = await M.signInWithPopup(this.auth, new M.GoogleAuthProvider()); try { await M.setDoc(M.doc(this.db, "users", r.user.uid), {name: r.user.displayName || "", email: r.user.email || ""}, {merge: true}); } catch (e) {} await this._waitUser(); return this.user; } catch (e) { throw new Error(errMsg(e)); } }
    async _waitUser() { for (let i = 0; i < 40 && !(this.user && this._fbUser && this.user.uid === this._fbUser.uid); i++) await new Promise(r => setTimeout(r, 50)); }
    async reset(email) { try { await this.M.sendPasswordResetEmail(this.auth, String(email).trim()); return "Password reset email pathano hoyeche. Inbox/spam dekho."; } catch (e) { throw new Error(errMsg(e)); } }
    async signOut() { await this.M.signOut(this.auth); }
    watchApps(cb) {
      const M = this.M; return M.onSnapshot(M.collection(this.db, "apps"), (snap) => cb(snap.docs.map(d => Object.assign({id: d.id}, d.data()))), (err) => { console.warn("apps", err); cb([], err); });
    }
    async getShots(id) { const M = this.M; try { const s = await M.getDoc(M.doc(this.db, "shots", id)); return s.exists() ? (s.data().list || []) : []; } catch (e) { return []; } }
    async saveApp(app, shots) {
      const M = this.M, b = M.writeBatch(this.db); const clean = JSON.parse(JSON.stringify(app));
      b.set(M.doc(this.db, "apps", app.id), clean); if (shots) b.set(M.doc(this.db, "shots", app.id), {list: shots});
      try { await b.commit(); } catch (e) { throw new Error(errMsg(e)); } return clean;
    }
    async deleteApp(id) { const M = this.M, b = M.writeBatch(this.db); b.delete(M.doc(this.db, "apps", id)); b.delete(M.doc(this.db, "shots", id)); try { await b.commit(); } catch (e) { throw new Error(errMsg(e)); } }
    async getUserData(uid) { const M = this.M; try { const s = await M.getDoc(M.doc(this.db, "users", uid)); return s.exists() ? s.data() : {}; } catch (e) { return {}; } }
    async setUserData(uid, patch) { const M = this.M; try { await M.setDoc(M.doc(this.db, "users", uid), patch, {merge: true}); } catch (e) { console.warn("userdata", e); } }
    async getReviews(appId) { const M = this.M; try { const q = M.query(M.collection(this.db, "reviews"), M.where("appId", "==", appId)); const s = await M.getDocs(q); return s.docs.map(d => d.data()).sort((a, b) => (b.ts || 0) - (a.ts || 0)); } catch (e) { return []; } }
    async addReview(appId, r) { const M = this.M; try { await M.setDoc(M.doc(this.db, "reviews", appId + "_" + r.uid), Object.assign({appId, ts: Date.now()}, r)); } catch (e) { throw new Error(errMsg(e)); } }
    async deleteReview(appId, uid) { const M = this.M; try { await M.deleteDoc(M.doc(this.db, "reviews", appId + "_" + uid)); } catch (e) { throw new Error(errMsg(e)); } }
    async _storage() {
      if (this.S) return this.S; const m = await import("https://www.gstatic.com/firebasejs/" + FB_VER + "/firebase-storage.js"); this.S = m; this.storage = m.getStorage(this.app); return m;
    }
    async uploadApk(file, info, onProgress) {
      const prov = info.provider || (CFG.useStorage ? "storage" : "github");
      if (prov === "github") return GH.upload(file, info, onProgress);
      const S = await this._storage(), path = "apks/" + slug(info.id) + "/" + Date.now() + "-" + (file.name || "app.apk").replace(/[^A-Za-z0-9._-]+/g, "-");
      const task = S.uploadBytesResumable(S.ref(this.storage, path), file, {contentType: "application/vnd.android.package-archive"});
      await new Promise((res, rej) => task.on("state_changed", (s) => onProgress && onProgress(s.bytesTransferred / s.totalBytes), (e) => rej(new Error(e.code === "storage/unauthorized" ? "Storage permission nei (rules / Blaze plan check koro)." : errMsg(e))), res));
      return {url: await S.getDownloadURL(task.snapshot.ref), meta: {provider: "storage", path}};
    }
    async deleteApk(meta) {
      if (!meta) return false; if (meta.provider === "github") return GH.remove(meta);
      if (meta.provider === "storage") { const S = await this._storage(); try { await S.deleteObject(S.ref(this.storage, meta.path)); } catch (e) {} } return true;
    }
    apkProviders() { const l = [{id: "github", label: "GitHub (free)"}]; if (CFG.useStorage) l.push({id: "storage", label: "Firebase Storage"}); l.push({id: "link", label: "Paste link"}); return l; }
  }

  window.Backend = HAS_FB ? new FirebaseBackend() : new LocalBackend();
  window.BackendUtil = {resizeImage, dominantColor, slug, fmtSize, errMsg, GH, lsGet, lsSet};
})();
