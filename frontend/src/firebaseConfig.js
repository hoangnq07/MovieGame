import { initializeApp , getApps} from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAqbuTEIvKsjodC4rvDTtfS6gdcY4vmk44",
  authDomain: "moviegame-9a57e.firebaseapp.com",
  projectId: "moviegame-9a57e",
  storageBucket: "moviegame-9a57e.firebasestorage.app",
  messagingSenderId: "151527639810",
  appId: "11:151527639810:web:8f20331c368bdb2911901b",
  authDomain: "moviegame-9a57e.firebaseapp.com"


};

// Khởi tạo Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);

// Google & Facebook Providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export { auth, googleProvider, facebookProvider };
