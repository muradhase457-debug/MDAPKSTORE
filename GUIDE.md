# MD APK Store – Setup Guide (Banglish)

## A. Firebase (ek bar)
1. console.firebase.google.com → Add project (Analytics off).
2. Build → Authentication → Get started → Sign-in method → **Email/Password** Enable (Google chaile oita-o).
3. Authentication → Settings → Authorized domains → Add: `mdapkstore.vercel.app` (tomar Vercel domain).
4. Build → Firestore Database → Create database (production mode).
5. Firestore → Rules → `firestore.rules` file er shob copy kore paste → Publish.
6. Project settings (gear) → Your apps → Web `</>` → register → `firebaseConfig` er value gulo copy.
7. GitHub e `config.js` open → ✏️ edit → `firebase:{...}` er vitor oi value gulo boshao → Commit.

## B. APK hosting (GitHub Releases)
1. `config.js` e `github:{owner:"muradhase457-debug", repo:"MDAPKSTORE"}` likho → Commit.
2. GitHub → Settings → Developer settings → Fine-grained tokens → Generate: repo = MDAPKSTORE, Permission **Contents: Read and write**. Token copy koro.
3. Admin panel → Settings tab → Owner/Repo/Token boshao → Test.
(Token sudhu tomar phone er browser e thake.)

## C. Admin hou
1. `tomar-site/admin.html` open → Create account.
2. "Admin access nei" screen e UID dekhabe → Copy.
3. Firebase → Firestore → Start collection `admins` → Document ID = oi UID → field `ok` = true → Save.
4. admin.html reload → ekhon admin.

## D. App upload / delete
admin.html → Add app → icon, screenshot, naam, details, APK file select → Save.
My apps tab theke Delete (APK-o delete hoy).
GitHub upload kaj na korle "Paste link" mode: APK manually GitHub Release e dao, link paste koro.

## E. User account
Store e login/sign up korle wishlist, installed, review shob account e save. Onno phone e same email+password dile same data.

## GitHub e upload korar file
index.html, admin.html, app.js, config.js, backend.js, authview.js, admin.js, vercel.json, firestore.rules, GUIDE.md, apps.json, assets/ (optional), apk/ (optional).
Firebase config na dile site demo mode e cholbe (data sudhu oi phone e).
