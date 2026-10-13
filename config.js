/* ============================================================
   STORE SETTINGS — sirf ei file ta edit korte hobe (GitHub e ✏️ Edit)
   ============================================================ */
window.STORE_CONFIG = {
  storeName: "My APK Store",

  /* Firebase Console → Project settings → Your apps → Web app → "firebaseConfig" er value gulo ekhane boshao.
     Khali rakhle site "demo mode" e cholbe (login/admin shudhu ei browser e save hobe). */
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  /* APK upload GitHub Releases e hobe (free, card lagbe na). Tomar GitHub username ar repo er naam: */
  github: { owner: "", repo: "" },

  /* Firebase Storage chalu korle (Blaze plan lage) true koro. Na bujhle false rakho. */
  useStorage: false,

  /* true = login na kore o keu app dekhte o install korte parbe (guest). */
  allowGuest: true
};
