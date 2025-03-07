import { useEffect, useState, useCallback, useRef } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import { FaStar, FaHeart, FaShare } from "react-icons/fa";
import MovieDetailsModal from "../components/MovieDetailsModal";
import "../styles/movies.css";
import debounce from 'lodash/debounce';
import Recommendations from "../components/Recommendations";

const GENRES = [
  { id: 28, name: "Hành Động" },
  { id: 12, name: "Phiêu Lưu" },
  { id: 16, name: "Hoạt Hình" },
  { id: 35, name: "Hài" },
  { id: 80, name: "Hình Sự" },
  { id: 99, name: "Tài Liệu" },
  { id: 18, name: "Chính Kịch" },
  { id: 10751, name: "Gia Đình" },
  { id: 14, name: "Giả Tưởng" },
  { id: 36, name: "Lịch Sử" },
  { id: 27, name: "Kinh Dị" },
  { id: 10402, name: "Nhạc" },
  { id: 9648, name: "Bí Ẩn" },
  { id: 10749, name: "Lãng Mạn" },
  { id: 878, name: "Khoa Học Viễn Tưởng" },
  { id: 10770, name: "Phim Truyền Hình" },
  { id: 53, name: "Gây Cấn" },
  { id: 10752, name: "Chiến Tranh" },
  { id: 37, name: "Cao Bồi" }
];

// MovieCard component
const MovieCard = ({ movie, onShowDetails, onToggleFavorite, onRate, rating, isFavorite }) => (
  <div className="movie-card">
    <LazyLoadImage
      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
      alt={movie.title}
      effect="blur"
      className="movie-poster"
      onClick={() => onShowDetails(movie)}
    />
    <div className="movie-content">
      <h4 className="movie-title">{movie.title}</h4>
      <p className="movie-release-date">
        {movie.release_date && new Date(movie.release_date).getFullYear()}
      </p>
      
      <div className="movie-actions">
        <div className="star-rating">
          {[...Array(5)].map((_, index) => (
            <FaStar
              key={index}
              size={20}
              color={index + 1 <= rating ? "#FFD700" : "#ccc"}
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                onRate(index + 1);
              }}
            />
          ))}
        </div>
        
        <button 
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(movie); // Truyền movie object vào hàm
          }}
        >
          <FaHeart color={isFavorite ? "#ff4444" : "#666"} />
        </button>
      </div>

      <div className="movie-rating">
        <FaStar size={12} color="#ffd700" />
        <span>{(movie.vote_average || 0).toFixed(1)}/10</span>
      </div>
    </div>
  </div>
);

const Movies = () => {
  // Di chuyển function này lên đầu component
  const removeDuplicateMovies = (movies) => {
    const uniqueMovies = new Map();
    movies.forEach(movie => {
      if (!uniqueMovies.has(movie.id)) {
        uniqueMovies.set(movie.id, movie);
      }
    });
    return Array.from(uniqueMovies.values());
  };

  // State Management
  
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [actualSearch, setActualSearch] = useState(""); // từ khóa tìm kiếm thực tế
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [sortBy, setSortBy] = useState("popularity");
  const [filterYear, setFilterYear] = useState("");
  const [filterGenre, setFilterGenre] = useState("");
  const searchRef = useRef(null);

  // Thêm state để lưu trữ danh sách thể loại
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState("");

  // Local Storage Management
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("favoriteMovies");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error loading favorites:", error);
      return [];
    }
  });
  
  const [ratings, setRatings] = useState(() => {
    try {
      const saved = localStorage.getItem("movieRatings");
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Error loading ratings:", error);
      return {};
    }
  });

  // API Calls
  const fetchMovies = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      // Base URL với các tham số cơ bản
      let url = `https://api.themoviedb.org/3/discover/movie?api_key=${
        import.meta.env.VITE_TMDB_API_KEY
      }&page=${pageNum}&language=vi-VN`;

      // Thêm tham số sắp xếp
      switch (sortBy) {
        case 'popularity':
          url += '&sort_by=popularity.desc';
          break;
        case 'top_rated':
          url += '&sort_by=vote_average.desc&vote_count.gte=100';
          break;
        default:
          url += '&sort_by=popularity.desc';
      }

      // Thêm filter theo genre nếu có
      if (filterGenre) {
        url += `&with_genres=${filterGenre}`;
      }

      // Thêm filter theo năm nếu có
      if (filterYear) {
        url += `&primary_release_year=${filterYear}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Kiểm tra nếu không có kết quả
      if (data.results.length === 0) {
        setHasMore(false);
      }
      
      return data.results;
    } catch (err) {
      console.error("Lỗi khi tải phim:", err);
      setError("Có lỗi xảy ra khi tải danh sách phim");
      return [];
    } finally {
      setLoading(false);
    }
  }, [sortBy, filterGenre, filterYear]); // Thêm các dependencies

  // Debounced search suggestions
  const fetchSearchSuggestions = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${
            import.meta.env.VITE_TMDB_API_KEY
          }&query=${encodeURIComponent(query)}&language=vi-VN&page=1`
        );
        
        if (!response.ok) throw new Error("Lỗi tìm kiếm");
        
        const data = await response.json();
        if (!data || !data.results) {
          throw new Error("Dữ liệu không hợp lệ");
        }
        
        // Chỉ lấy các thông tin cần thiết
        const suggestions = data.results.slice(0, 5).map(movie => ({
          id: movie.id,
          title: movie.title,
          releaseDate: movie.release_date,
          posterPath: movie.poster_path
        }));
        
        setSearchResults(suggestions);
      } catch (err) {
        console.error("Lỗi khi tìm kiếm:", err);
        setSearchResults([]);
      }
    }, 300),
    []
  );

  // Thêm component SearchSuggestions
  const SearchSuggestions = ({ results, onSuggestionClick }) => {
    if (!results.length) return null;

    return (
      <div className="search-suggestions">
        {results.map(movie => (
          <div
            key={movie.id}
            className="suggestion-item"
            onClick={() => onSuggestionClick(movie)}
          >
            <div className="suggestion-content">
              <img
                src={movie.posterPath 
                  ? `https://image.tmdb.org/t/p/w92${movie.posterPath}`
                  : '/placeholder-poster.png'}
                alt={movie.title}
                className="suggestion-poster"
              />
              <div className="suggestion-info">
                <div className="suggestion-title">{movie.title}</div>
                {movie.releaseDate && (
                  <div className="suggestion-year">
                    {new Date(movie.releaseDate).getFullYear()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Event Handlers
  const loadMoreMovies = async () => {
    if (!loading) {
      const newMovies = await fetchMovies(page);
      if (newMovies.length > 0) {
        setMovies(prev => {
          const combinedMovies = [...prev, ...newMovies];
          return removeDuplicateMovies(combinedMovies);
        });
        setPage(prev => prev + 1);
      } else {
        setHasMore(false);
      }
    }
  };

  const handleRating = (movie, rating) => {
    if (!movie || !movie.id) return; // Thêm kiểm tra để tránh lỗi

    const newRatings = { ...ratings, [movie.id]: rating };
    setRatings(newRatings);
    localStorage.setItem("movieRatings", JSON.stringify(newRatings));
  };

  const handleToggleFavorite = (movie) => {
    if (!movie || !movie.id) return;

    setFavorites(prev => {
      // Kiểm tra xem phim đã có trong danh sách yêu thích chưa
      const existingFavorite = prev.find(f => f.id === movie.id);
      
      if (existingFavorite) {
        // Nếu đã có thì xóa khỏi danh sách
        const newFavorites = prev.filter(f => f.id !== movie.id);
        localStorage.setItem("favoriteMovies", JSON.stringify(newFavorites));
        return newFavorites;
      } else {
        // Nếu chưa có thì thêm vào danh sách
        const movieToAdd = {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          dateAdded: new Date().toISOString(),
          userRating: ratings[movie.id] || 0
        };
        const newFavorites = [...prev, movieToAdd];
        localStorage.setItem("favoriteMovies", JSON.stringify(newFavorites));
        return newFavorites;
      }
    });
  };

  const shareMovie = async (movie) => {
    const shareData = {
      title: movie.title,
      text: `Xem phim: ${movie.title}`,
      url: `https://www.themoviedb.org/movie/${movie.id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${shareData.text}\n${shareData.url}`
        );
        alert("Đã sao chép link!");
      }
    } catch (err) {
      console.error("Lỗi khi chia sẻ:", err);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim()) {
      fetchSearchSuggestions(value);
      setShowSuggestions(true);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActualSearch(searchQuery);
      setShowSuggestions(false);
      setMovies([]); // Reset movies
      setPage(1); // Reset page
      loadMoreMovies(); // Load new results
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = async (suggestion) => {
    try {
      setLoading(true);
      setSearchQuery(suggestion.title);
      setActualSearch(suggestion.title);
      setShowSuggestions(false);
      
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${
          import.meta.env.VITE_TMDB_API_KEY
        }&query=${encodeURIComponent(suggestion.title)}&language=vi-VN&page=1`
      );

      if (!response.ok) {
        throw new Error("Không thể tải phim");
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.results)) {
        throw new Error("Dữ liệu không hợp lệ");
      }

      setMovies(data.results);
      setPage(2);
      setHasMore(data.results.length === 20); // TMDB returns 20 results per page
    } catch (err) {
      console.error("Lỗi khi tải phim từ gợi ý:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Effects
  useEffect(() => {
    setMovies([]);
    setPage(1);
    loadMoreMovies();
  }, [sortBy, filterYear, filterGenre]);

  // Filtering
  const filteredMovies = removeDuplicateMovies(
    movies.filter(movie =>
      movie.title.toLowerCase().includes(actualSearch.toLowerCase())
    )
  );

  // Thêm error boundary để xử lý lỗi
  useEffect(() => {
    const loadInitialMovies = async () => {
      try {
        setLoading(true);
        const initialMovies = await fetchMovies(1);
        if (initialMovies && Array.isArray(initialMovies)) {
          setMovies(initialMovies);
          setPage(2);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu ban đầu:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadInitialMovies();
  }, [fetchMovies]);

  // Thêm useEffect để fetch danh sách thể loại khi component mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/genre/movie/list?api_key=${
            import.meta.env.VITE_TMDB_API_KEY
          }&language=vi-VN`
        );
        
        if (!response.ok) throw new Error("Không thể tải danh sách thể loại");
        
        const data = await response.json();
        setGenres(data.genres || []);
      } catch (err) {
        console.error("Lỗi khi tải danh sách thể loại:", err);
      }
    };

    fetchGenres();
  }, []);

  // Thêm handler cho việc chọn thể loại
  const handleGenreClick = (genreId) => {
    setSelectedGenre(genreId === selectedGenre ? "" : genreId);
    setMovies([]); // Reset movies
    setPage(1); // Reset page
  };

  // Thêm useEffect để reset và load lại movies khi filters thay đổi
  useEffect(() => {
    setMovies([]); // Reset danh sách phim
    setPage(1); // Reset về trang 1
    setHasMore(true); // Reset trạng thái hasMore
    loadMoreMovies(); // Tải lại danh sách phim với filters mới
  }, [sortBy, filterGenre, filterYear]);

  // Sửa lại hàm kiểm tra isFavorite
  const isFavorite = (movieId) => {
    return movieId ? favorites.some(f => f.id === movieId) : false;
  };

  return (
    <div className="movies-container">
      {loading && <div className="loading">Đang tải...</div>}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => {
            setError(null);
            setPage(1);
            setMovies([]);
            loadMoreMovies();
          }}>
            Thử lại
          </button>
        </div>
      )}
      <div className="movies-header">
        <div className="search-container" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm phim..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
              />
              <button type="submit" className="search-button">
                Tìm
              </button>
            </div>
          </form>

          {showSuggestions && (
            <SearchSuggestions
              results={searchResults}
              onSuggestionClick={handleSuggestionClick}
            />
          )}
        </div>

        <div className="filters">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="popularity">Phổ biến</option>
            <option value="top_rated">Đánh giá cao</option>
          </select>

          <select 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)}
            className="filter-select"
          >
            <option value="">Tất cả năm</option>
            {[...Array(10)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>

          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="filter-select"
          >
            <option value="">Tất cả thể loại</option>
            {GENRES.map(genre => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <InfiniteScroll
        dataLength={filteredMovies.length}
        next={loadMoreMovies}
        hasMore={hasMore}
        loader={<div className="loading">Đang tải thêm phim...</div>}
        endMessage={<div className="end-message">Đã tải hết phim! ���</div>}
      >
        <div className="movies-grid">
          {filteredMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onShowDetails={setSelectedMovie}
              onToggleFavorite={() => handleToggleFavorite(movie)}
              onRate={(rating) => handleRating(movie, rating)}
              rating={ratings[movie.id] || 0}
              isFavorite={isFavorite(movie.id)}
            />
          ))}
        </div>
      </InfiniteScroll>

      {selectedMovie && (
        <MovieDetailsModal
          movieId={selectedMovie.id}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </div>
  );
};

export default Movies;
