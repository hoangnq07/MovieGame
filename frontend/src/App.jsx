import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext"; // ✅ Thêm AuthProvider
import Header from "./components/Header";
import Home from "./pages/Home";
import Movies from "./pages/Movies";
import Manga from "./pages/Manga";
import Books from "./pages/Books";
import Games from "./pages/Games";
import Settings from "./pages/Settings";
import Anime from "./pages/Anime";
import Favorites from "./pages/Favorites";
import AnimeStats from "./pages/AnimeStats";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ Sử dụng ProtectedRoute
import "./index.css";

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Header />

        <Routes>
          <Route path="*" element={<NotFound />} />
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* 🔒 Các route yêu cầu đăng nhập */}
          <Route path="/movies" element={<ProtectedRoute><Movies /></ProtectedRoute>} />
          <Route path="/manga" element={<ProtectedRoute><Manga /></ProtectedRoute>} />
          <Route path="/books" element={<ProtectedRoute><Books /></ProtectedRoute>} />
          <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
          <Route path="/anime" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Anime />
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><AnimeStats /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
