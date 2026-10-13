/* ============================================================
   Login / Sign-up / Forgot password card (store + admin dui jaygay)
   ============================================================ */
"use strict";
const AV_STR = {
  en: {welcome: "Welcome", sub: "Log in to sync your wishlist and installed apps on every phone.", login: "Log in", signup: "Create account", name: "Your name", email: "Email", password: "Password", show: "Show", hide: "Hide", forgot: "Forgot password?", or: "or", google: "Continue with Google", guest: "Continue as guest", back: "Back to log in", sendReset: "Send reset link", haveNo: "New here?", haveYes: "Already have an account?", loading: "Preparing 3D shelf…", done: "Ready", demo: "Demo mode — accounts are saved only in this browser. Add Firebase keys in config.js for real accounts.", needName: "Name likho", needEmail: "Email likho", needPass: "Password likho (6+ akkhor)", resetHint: "Enter your email and we will send a reset link.", signupHint: "Same email + password diye onno phone e log in korle sob wishlist/installed app pabe."},
  bn: {welcome: "স্বাগতম", sub: "লগইন করলে উইশলিস্ট ও ইনস্টল করা অ্যাপ সব ফোনে পাবেন।", login: "লগইন", signup: "অ্যাকাউন্ট খুলুন", name: "আপনার নাম", email: "ইমেইল", password: "পাসওয়ার্ড", show: "দেখান", hide: "লুকান", forgot: "পাসওয়ার্ড ভুলে গেছেন?", or: "অথবা", google: "Google দিয়ে চালিয়ে যান", guest: "গেস্ট হিসেবে চালিয়ে যান", back: "লগইনে ফিরুন", sendReset: "রিসেট লিংক পাঠান", haveNo: "নতুন?", haveYes: "আগে থেকেই অ্যাকাউন্ট আছে?", loading: "৩ডি তাক তৈরি হচ্ছে…", done: "তৈরি", demo: "ডেমো মোড — অ্যাকাউন্ট শুধু এই ব্রাউজারে থাকে।", needName: "নাম লিখুন", needEmail: "ইমেইল লিখুন", needPass: "পাসওয়ার্ড লিখুন (৬+ অক্ষর)", resetHint: "ইমেইল দিন, রিসেট লিংক পাঠানো হবে।", signupHint: "একই ইমেইল ও পাসওয়ার্ডে অন্য ফোনে লগইন করলে সব পাবেন।"}
};
const AuthView = {
  mount(root, o) {
    o = o || {}; const B = window.Backend, lang = o.lang || "en", S = AV_STR[lang] || AV_STR.en; let mode = o.mode || "login", busy = false;
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
    root.innerHTML = `<div class="av-card glass">
      <div class="av-logo"><i>▣</i></div>
      <h1 class="av-title">${esc(o.title || S.welcome)}</h1>
      <p class="av-sub" id="avSub"></p>
      <div class="av-tabs" id="avTabs"><button data-m="login">${esc(S.login)}</button><button data-m="signup">${esc(S.signup)}</button></div>
      <form id="avForm" novalidate autocomplete="on">
        <label class="av-f" id="fName"><span>${esc(S.name)}</span><input id="avName" type="text" autocomplete="name" maxlength="40"></label>
        <label class="av-f" id="fEmail"><span>${esc(S.email)}</span><input id="avEmail" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false"></label>
        <label class="av-f" id="fPass"><span>${esc(S.password)}</span><div class="av-pw"><input id="avPass" type="password" autocomplete="current-password"><button type="button" id="avShow">${esc(S.show)}</button></div></label>
        <div class="av-err" id="avErr" role="alert"></div>
        <button class="av-main" id="avGo" type="submit"></button>
      </form>
      <button class="av-link" id="avForgot" type="button">${esc(S.forgot)}</button>
      <div id="avAlt"><div class="av-or"><span>${esc(S.or)}</span></div>
        ${B.mode === "firebase" ? `<button class="av-alt" id="avGoogle" type="button"><b>G</b> ${esc(S.google)}</button>` : ""}
        ${o.allowGuest ? `<button class="av-alt ghost" id="avGuest" type="button">${esc(S.guest)}</button>` : ""}</div>
      ${B.mode === "local" ? `<p class="av-demo">${esc(S.demo)}</p>` : ""}
      <div class="av-prog" id="avProg" ${o.noProgress ? "hidden" : ""}><i id="avBar"></i><span id="avProgT">${esc(S.loading)}</span></div>
    </div>`;
    const $ = (s) => root.querySelector(s), setErr = (m) => { const e = $("#avErr"); if (!e) return; e.textContent = m || ""; e.style.display = m ? "block" : "none"; };
    const paint = () => {
      $("#avTabs").style.display = mode === "reset" ? "none" : "flex"; $$("#avTabs button").forEach(b => b.classList.toggle("on", b.dataset.m === mode));
      $("#fName").style.display = mode === "signup" ? "block" : "none"; $("#fPass").style.display = mode === "reset" ? "none" : "block";
      $("#avGo").textContent = mode === "login" ? S.login : mode === "signup" ? S.signup : S.sendReset;
      $("#avForgot").textContent = mode === "reset" ? S.back : S.forgot; $("#avForgot").style.display = mode === "signup" ? "none" : "inline-block";
      $("#avAlt").style.display = mode === "reset" ? "none" : "block";
      $("#avSub").textContent = mode === "reset" ? S.resetHint : mode === "signup" ? S.signupHint : (o.sub || S.sub);
      $("#avPass").autocomplete = mode === "signup" ? "new-password" : "current-password"; setErr("");
    };
    const $$ = (s) => [...root.querySelectorAll(s)];
    $$("#avTabs button").forEach(b => b.onclick = () => { mode = b.dataset.m; paint(); });
    $("#avForgot").onclick = () => { mode = mode === "reset" ? "login" : "reset"; paint(); };
    $("#avShow").onclick = () => { const p = $("#avPass"), s = p.type === "password"; p.type = s ? "text" : "password"; $("#avShow").textContent = s ? S.hide : S.show; };
    const lock = (v) => { busy = v; const go = $("#avGo"); if (go) { go.disabled = v; go.classList.toggle("busy", v); } const g = $("#avGoogle"); if (g) g.disabled = v; };
    $("#avForm").onsubmit = async (e) => {
      e.preventDefault(); if (busy) return; setErr("");
      const name = $("#avName").value.trim(), email = $("#avEmail").value.trim(), pass = $("#avPass").value;
      if (!email) return setErr(S.needEmail);
      lock(true);
      try {
        if (mode === "reset") { const m = await B.reset(email); setErr(""); $("#avSub").textContent = m; mode = "login"; $("#avForgot").textContent = S.forgot; }
        else if (mode === "signup") { if (!name) { lock(false); return setErr(S.needName); } if (pass.length < 6) { lock(false); return setErr(S.needPass); } const u = await B.signUp(name, email, pass); o.onSuccess && o.onSuccess(u); }
        else { if (!pass) { lock(false); return setErr(S.needPass); } const u = await B.signIn(email, pass); o.onSuccess && o.onSuccess(u); }
      } catch (err) { setErr(err.message || String(err)); }
      lock(false);
    };
    const g = $("#avGoogle"); if (g) g.onclick = async () => { if (busy) return; setErr(""); lock(true); try { const u = await B.signInGoogle(); o.onSuccess && o.onSuccess(u); } catch (err) { setErr(err.message || String(err)); } lock(false); };
    const gu = $("#avGuest"); if (gu) gu.onclick = () => o.onGuest && o.onGuest();
    paint();
    return {
      progress(p) { const b = $("#avBar"); if (b) b.style.width = Math.round(Math.min(1, p) * 100) + "%"; if (p >= 1) { const t = $("#avProgT"); if (t) t.textContent = S.done + " ✓"; } },
      hideProgress() { const p = $("#avProg"); if (p) p.hidden = true; }
    };
  }
};
