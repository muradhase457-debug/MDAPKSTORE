/* ============================================================
   STORE SETTINGS — sirf ei file ta edit korte hobe (GitHub e ✏️ Edit)
   ============================================================ */
window.STORE_CONFIG = {
  storeName: "My APK Store",

  /* Firebase Console → Project settings → Your apps → Web app → "firebaseConfig" er value gulo ekhane boshao.
     Khali rakhle site "demo mode" e cholbe (login/admin shudhu ei browser e save hobe). */
  firebase: {
    apiKey: "AIzaSyA2DTOaRmulB6jsAd4GPOFswcW4gdYwyJo",
    authDomain: "analytics-off-ae2a8.firebaseapp.com",
    projectId: "analytics-off-ae2a8",
    storageBucket: "analytics-off-ae2a8.firebasestorage.app",
    messagingSenderId: "699836994756",
    appId: "1:699836994756:web:406f1acae8761864946591"
  },

  /* APK upload GitHub Releases e hobe (free, card lagbe na). Tomar GitHub username ar repo er naam: */
  github: { owner: "muradhase457-debug", repo: "MDAPKSTORE" },

  /* Firebase Storage chalu korle (Blaze plan lage) true koro. Na bujhle false rakho. */
  useStorage: false,

  /* true = login na kore o keu app dekhte o install korte parbe (guest). */
  allowGuest: true
};
