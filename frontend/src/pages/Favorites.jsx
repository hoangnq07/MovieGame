import { useState, useEffect } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { FaStar, FaTrash } from "react-icons/fa";
import "../styles/favorites.css"; // Tạo file CSS mới cho Favorites

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [animeList, setAnimeList] = useState([]); // Thêm state cho anime
  const [gameFavorites, setGameFavorites] = useState([]); // Thêm state cho games
  const [sortBy, setSortBy] = useState("dateAdded");
  const [mangaFavorites, setMangaFavorites] = useState(() => {
    const saved = localStorage.getItem("favoriteManga");
    return saved ? JSON.parse(saved) : [];
  });
  const [bookFavorites, setBookFavorites] = useState(() => {
    const saved = localStorage.getItem("favoriteBooks");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    // Load movie favorites
    const savedMovies = localStorage.getItem("favoriteMovies");
    const movieFavorites = savedMovies ? JSON.parse(savedMovies) : [];

    // Load anime favorites
    const savedAnime = localStorage.getItem("favoriteAnime");
    const animeFavorites = savedAnime ? JSON.parse(savedAnime) : [];

    // Load game favorites
    const savedGames = localStorage.getItem("favoriteGames");
    const gameFavorites = savedGames ? JSON.parse(savedGames) : [];

    // Load book favorites
    const savedBooks = localStorage.getItem("favoriteBooks");
    const bookFavorites = savedBooks ? JSON.parse(savedBooks) : [];

    setFavorites(movieFavorites);
    setAnimeList(animeFavorites);
    setGameFavorites(gameFavorites);
    setBookFavorites(bookFavorites);
  }, []);

  const removeFavorite = (id, type = 'movie') => {
    if (type === 'movie') {
      const newFavorites = favorites.filter(movie => movie.id !== id);
      setFavorites(newFavorites);
      localStorage.setItem("favoriteMovies", JSON.stringify(newFavorites));
    } else if (type === 'anime') {
      const newAnimeFavorites = animeList.filter(anime => anime.mal_id !== id);
      setAnimeList(newAnimeFavorites);
      localStorage.setItem("favoriteAnime", JSON.stringify(newAnimeFavorites));
    } else if (type === 'manga') {
      const newMangaFavorites = mangaFavorites.filter(manga => manga.id !== id);
      setMangaFavorites(newMangaFavorites);
      localStorage.setItem("favoriteManga", JSON.stringify(newMangaFavorites));
    } else if (type === 'game') {
      const newGameFavorites = gameFavorites.filter(game => game.id !== id);
      setGameFavorites(newGameFavorites);
      localStorage.setItem("favoriteGames", JSON.stringify(newGameFavorites));
    }
  };

  const getSortedFavorites = () => {
    return [...favorites].sort((a, b) => {
      switch (sortBy) {
        case "dateAdded":
          return new Date(b.dateAdded) - new Date(a.dateAdded);
        case "rating":
          return b.userRating - a.userRating;
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  };

  const getSortedAnime = () => {
    return [...animeList].sort((a, b) => {
      switch (sortBy) {
        case "dateAdded":
          return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0);
        case "rating":
          return (b.score || 0) - (a.score || 0);
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  };

  const getSortedGames = () => {
    return [...gameFavorites].sort((a, b) => {
      switch (sortBy) {
        case "dateAdded":
          return new Date(b.dateAdded) - new Date(a.dateAdded);
        case "rating":
          return b.userRating - a.userRating;
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  };

  const getSortedBooks = () => {
    return [...bookFavorites].sort((a, b) => {
      switch (sortBy) {
        case "dateAdded":
          return new Date(b.dateAdded) - new Date(a.dateAdded);
        case "rating":
          return b.userRating - a.userRating;
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  };

  return (
    <div className="favorites-container">
      <div className="favorites-header">
        <h2>Danh Sách Yêu Thích</h2>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="dateAdded">Mới nhất</option>
          <option value="rating">Đánh giá cao nhất</option>
          <option value="title">Theo tên A-Z</option>
        </select>
      </div>

      <h3>Phim</h3>
      <div className="favorites-grid">
        {getSortedFavorites().map(movie => (
          <div key={movie.id} className="favorite-card">
            <LazyLoadImage
              src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
              alt={movie.title}
              effect="blur"
              className="favorite-poster"
            />
            <div className="favorite-content">
              <h4>{movie.title}</h4>
              <div className="favorite-rating">
                {[...Array(5)].map((_, index) => (
                  <FaStar
                    key={index}
                    color={index < movie.userRating ? "#FFD700" : "#ccc"}
                    size={16}
                  />
                ))}
              </div>
              <p className="favorite-date">
                Thêm vào: {new Date(movie.dateAdded).toLocaleDateString("vi-VN")}
              </p>
              <button 
                className="remove-btn"
                onClick={() => removeFavorite(movie.id, 'movie')}
              >
                <FaTrash /> Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3>Anime</h3>
      <div className="favorites-grid">
        {getSortedAnime().map(anime => (
          <div key={anime.mal_id} className="favorite-card">
            <LazyLoadImage
              src={anime.images?.jpg?.image_url}
              alt={anime.title}
              effect="blur"
              className="favorite-poster"
            />
            <div className="favorite-content">
              <h4>{anime.title}</h4>
              <div className="favorite-rating">
                <span>⭐ {anime.score || "N/A"}</span>
              </div>
              <p className="favorite-date">
                {anime.dateAdded && `Thêm vào: ${new Date(anime.dateAdded).toLocaleDateString("vi-VN")}`}
              </p>
              <button 
                className="remove-btn"
                onClick={() => removeFavorite(anime.mal_id, 'anime')}
              >
                <FaTrash /> Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3>Games</h3>
      <div className="favorites-grid">
        {getSortedGames().map(game => (
          <div key={game.id} className="favorite-card">
            <LazyLoadImage
              src={game.coverUrl}
              alt={game.title}
              effect="blur"
              className="favorite-poster"
            />
            <div className="favorite-content">
              <h4>{game.title}</h4>
              <div className="favorite-rating">
                {[...Array(5)].map((_, index) => (
                  <FaStar
                    key={index}
                    color={index < game.userRating ? "#FFD700" : "#ccc"}
                    size={16}
                  />
                ))}
              </div>
              <p className="favorite-date">
                Thêm vào: {new Date(game.dateAdded).toLocaleDateString("vi-VN")}
              </p>
              <button 
                className="remove-btn"
                onClick={() => removeFavorite(game.id, 'game')}
              >
                <FaTrash /> Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="favorites-section">
        <h3>Manga</h3>
        <div className="favorites-grid">
          {mangaFavorites.map(manga => (
            <div key={manga.id} className="favorite-card">
              <LazyLoadImage
                src={manga.coverUrl}
                alt={manga.title}
                effect="blur"
                className="favorite-poster"
              />
              <div className="favorite-content">
                <h4>{manga.title}</h4>
                <div className="favorite-rating">
                  {[...Array(5)].map((_, index) => (
                    <FaStar
                      key={index}
                      color={index < manga.userRating ? "#FFD700" : "#ccc"}
                      size={16}
                    />
                  ))}
                </div>
                <p className="favorite-date">
                  Thêm vào: {new Date(manga.dateAdded).toLocaleDateString("vi-VN")}
                </p>
                <button 
                  className="remove-btn"
                  onClick={() => removeFavorite(manga.id, 'manga')}
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h3>Books</h3>
      <div className="favorites-grid">
        {getSortedBooks().map(book => (
          <div key={book.id} className="favorite-card">
            <LazyLoadImage
              src={book.coverUrl}
              alt={book.title}
              effect="blur"
              className="favorite-poster"
            />
            <div className="favorite-content">
              <h4>{book.title}</h4>
              <p>{book.authors.join(', ')}</p>
              <div className="favorite-rating">
                {[...Array(5)].map((_, index) => (
                  <FaStar
                    key={index}
                    color={index < book.userRating ? "#FFD700" : "#ccc"}
                    size={16}
                  />
                ))}
              </div>
              <p className="favorite-date">
                Added: {new Date(book.dateAdded).toLocaleDateString()}
              </p>
              <button 
                className="remove-btn"
                onClick={() => removeFavorite(book.id, 'book')}
              >
                <FaTrash /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {favorites.length === 0 && 
       animeList.length === 0 && 
       mangaFavorites.length === 0 &&
       gameFavorites.length === 0 && (
        <div className="no-favorites">
          <p>Chưa có nội dung yêu thích nào.</p>
        </div>
      )}
    </div>
  );
};

export default Favorites;
