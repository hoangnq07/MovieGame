import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Movies from "./pages/Movies";
import Manga from "./pages/Manga";
import Books from "./pages/Books";
import Games from "./pages/Games";
import Settings from "./pages/Settings";
import Anime from "./pages/Anime";
import Favorites from "./pages/Favorites";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";

import "./index.css";
import Stats from "./pages/Stats";

const App = () => {
  return (
    <Router>
   
        <Header />

        <Routes>
          <Route path="*" element={<NotFound />} />
          <Route path="/" element={<Home />} />
          

          {/* 🔒 Các route yêu cầu đăng nhập */}
          <Route path="/movies" element={<Movies />} />
          <Route path="/manga" element={<Manga />} />
          <Route path="/books" element={<Books />} />
          <Route path="/games" element={<Games />} />
          <Route path="/anime" element={
           
              <ErrorBoundary>
                <Anime />
              </ErrorBoundary>
          
          } />
          <Route path="/favorites" element={<Favorites />}/>
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
  
    </Router>
  );
};

export default App;
