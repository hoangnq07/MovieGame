import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider, facebookProvider } from "../firebaseConfig";
import { signInWithRedirect, getRedirectResult } from "firebase/auth";

const Login = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ✅ Xử lý kết quả sau khi Redirect (Google/Facebook login)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);

        if (result && result.user) {
          // 🔑 Lấy ID Token từ Firebase
          const idToken = await result.user.getIdToken();

          // 📡 Gửi ID Token đến Backend để xác minh và tạo JWT
          const res = await axios.post("http://localhost:5000/api/auth/social-login", { idToken });

          if (res.data.success) {
            // ✅ Lưu JWT Token vào LocalStorage
            localStorage.setItem("token", res.data.token);

            // ✅ Điều hướng về trang chủ kèm state (để kiểm tra nếu cần)
            navigate("/", { state: { fromLogin: true } });
          } else {
            setError("Xác thực với Backend thất bại");
          }
        }
      } catch (err) {
        setError(err.message);
      }
    };

    handleRedirectResult();
  }, [navigate]);

  // 📌 Login với Google
  const handleGoogleLogin = async () => {
    try {
      await signInWithRedirect(auth, googleProvider); // Chỉ kích hoạt redirect
    } catch (err) {
      setError(err.message);
    }
  };

  // 📌 Login với Facebook
  const handleFacebookLogin = async () => {
    try {
      await signInWithRedirect(auth, facebookProvider); // Chỉ kích hoạt redirect
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
