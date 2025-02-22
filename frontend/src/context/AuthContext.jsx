import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // ✅ Kiểm tra token khi load trang (hoặc sau reload)
  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("💾 Kiểm tra token trong localStorage:", token);
    if (token) {
      setUser({ token }); // Giả định người dùng đã đăng nhập nếu có token
    }
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    setUser({ token });
    navigate("/"); // Điều hướng về trang chủ
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
