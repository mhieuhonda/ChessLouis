// Cấu hình Firebase — ChessLouis
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyAt_w384Zindk9H0txRQAkX-AlnOT6WVvg",
  authDomain: "cheouis.firebaseapp.com",
  projectId: "cheouis",
  storageBucket: "cheouis.firebasestorage.app",
  messagingSenderId: "827238875958",
  appId: "1:827238875958:web:7fe15ad9ebcb79652e6997"
};

const app = initializeApp(firebaseConfig);

export default app;
