/* ============================================================
   VANTAGE — Firebase configuration
   ------------------------------------------------------------
   1. Create a project at https://console.firebase.google.com
   2. Add a Web app, then copy the config object here.
   3. Enable Authentication → Sign-in method → Email/Password
      (and Google, if you want the Google button to work).
   4. Add your deployed domain under Authentication → Settings
      → Authorized domains.

   Until real values are filled in, Vantage runs in "local demo"
   auth mode so every page still works offline. Demo accounts
   are stored only in this browser.
   ============================================================ */
window.VANTAGE_FIREBASE = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
