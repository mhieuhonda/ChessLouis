// ChessLouis — Đăng ký / Đăng nhập
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { auth, db, FOUNDER_USERNAME } from "./firebase.js";
import { isFounder } from "./utils.js";

// ĐĂNG KÝ
export async function register(email, password, username) {
  const cleanUsername = (username || "").trim();
  if (cleanUsername.length < 3) {
    throw new Error("Tên người chơi phải có ít nhất 3 ký tự");
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName: cleanUsername });

  const founder = isFounder(cleanUsername);

  await setDoc(doc(db, "users", user.uid), {
    username: cleanUsername,
    email: email,
    avatar: "default",
    elo: 1000,
    rank: "Tân thủ",
    role: founder ? "admin" : "player",
    wins: 0,
    losses: 0,
    draws: 0,
    banned: false,
    createdAt: new Date()
  });

  return user;
}

// ĐĂNG NHẬP
export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Dịch lỗi Firebase Auth sang tiếng Việt dễ hiểu
export function translateAuthError(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "Email này đã được đăng ký",
    "auth/invalid-email": "Email không hợp lệ",
    "auth/weak-password": "Mật khẩu quá yếu (tối thiểu 6 ký tự)",
    "auth/user-not-found": "Tài khoản không tồn tại",
    "auth/wrong-password": "Sai mật khẩu",
    "auth/invalid-credential": "Email hoặc mật khẩu không đúng",
    "auth/too-many-requests": "Bạn thử quá nhiều lần, vui lòng chờ một chút"
  };
  return map[code] || error.message || "Đã có lỗi xảy ra";
}
