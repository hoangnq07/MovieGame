import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // ✅ Sử dụng AuthContext
import DarkModeToggle from "./DarkModeToggle";

const Header = () => {
  const { user, logout } = useAuth(); // ✅ Lấy user và logout từ context

  return (
    <nav style={{ display: "flex", justifyContent: "space-between", padding: "10px", backgroundColor: "#282c34" }}>
      <div style={{ display: "flex", gap: "15px" }}>
        <Link to="/" style={{ color: "white" }}>🏠 Home</Link>
        <Link to="/movies" style={{ color: "white" }}>🎬 Movies</Link>
        <Link to="/manga" style={{ color: "white" }}>📖 Manga</Link>
        <Link to="/books" style={{ color: "white" }}>📚 Books</Link>
        <Link to="/games" style={{ color: "white" }}>🎮 Games</Link>
        <Link to="/anime" style={{ color: "white" }}>📺 Anime</Link>
        <Link to="/favorites" style={{ color: "white" }}>❤️ Yêu Thích</Link>
        <Link to="/stats" style={{ color: "white" }}>📊 Thống Kê</Link>
        <Link to="/settings" style={{ color: "white" }}>⚙️ Settings</Link>

        <span style={{ float: "right" }}>
          {user ? (
            <button onClick={logout}>Logout</button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </span>
      </div>

      {/* 🌙 Toggle Dark/Light Mode */}
      <DarkModeToggle />
    </nav>
  );
};

export default Header;
