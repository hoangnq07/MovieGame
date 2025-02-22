import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider, facebookProvider } from "../firebaseConfig";
import { signInWithRedirect, getRedirectResult } from "firebase/auth";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        console.log("🔄 Redirect Result:", result);
  
        if (result && result.user) {
          const idToken = await result.user.getIdToken();
          console.log("🔑 Firebase ID Token:", idToken);
  
          // 📡 Gửi ID Token đến Backend
          const res = await axios.post("http://localhost:5000/api/auth/social-login", { idToken });
          console.log("🟢 Backend Response:", res.data);
  
          if (res.data.success) {
            localStorage.setItem("token", res.data.token); // ✅ Lưu token vào localStorage
            console.log("💾 Token lưu vào localStorage:", res.data.token);
            navigate("/", { state: { fromLogin: true } }); // ✅ Điều hướng về Home
          } else {
            setError("Xác thực với Backend thất bại");
          }
        }
      } catch (err) {
        console.error("❌ Lỗi khi xử lý redirect:", err);
        setError(err.message);
      }
    };
  
    handleRedirectResult();
  }, [navigate]);
  
  // 📌 Login với Google
  const handleGoogleLogin = async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      setError(err.message);
    }
  };

  // 📌 Login với Facebook
  const handleFacebookLogin = async () => {
    try {
      await signInWithRedirect(auth, facebookProvider);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>🔐 Đăng Nhập</h2>

      <button onClick={handleGoogleLogin}>🔵 Đăng nhập với Google</button>
      <br /><br />
      <button onClick={handleFacebookLogin}>🔷 Đăng nhập với Facebook</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default Login;
