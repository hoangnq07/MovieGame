import { useState, useEffect } from 'react';
import { FaHeart, FaRegHeart, FaStar } from 'react-icons/fa';
import Modal from 'react-modal';
import "../styles/games.css";

Modal.setAppElement("#root");

const Games = () => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [gamesList, setGamesList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [ratings, setRatings] = useState(() => {
    const saved = localStorage.getItem("gameRatings");
    return saved ? JSON.parse(saved) : {};
  });
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favoriteGames");
    return saved ? JSON.parse(saved) : [];
  });
  const [sortBy, setSortBy] = useState('relevance');

  // Fetch games từ RAWG API
  const fetchGames = async (query, pageNum = 1) => {
    try {
      setIsLoading(true);
      const API_KEY = '6119e670079f47ad88badf42669c35fb'; // Bạn cần đăng ký API key từ RAWG
      const baseUrl = 'https://api.rawg.io/api/games';
      let url = `${baseUrl}?key=${API_KEY}&page=${pageNum}&page_size=12`;
      
      if (query) {
        url += `&search=${encodeURIComponent(query)}`;
      }

      // Thêm sorting
      if (sortBy === 'rating') {
        url += '&ordering=-rating';
      } else if (sortBy === 'released') {
        url += '&ordering=-released';
      }

      const response = await fetch(url);
      const data = await response.json();

      return data.results.map(game => ({
        id: game.id,
        title: game.name,
        coverUrl: game.background_image,
        rating: game.rating,
        releaseDate: game.released,
        platforms: game.platforms?.map(p => p.platform.name) || [],
        genres: game.genres?.map(g => g.name) || [],
        description: game.description_raw || 'No description available'
      }));

    } catch (error) {
      console.error('Error fetching games:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    const newGames = await fetchGames(searchQuery, 1);
    setGamesList(newGames);
  };

  // Load more games
  const loadMoreGames = async () => {
    if (!isLoading) {
      const nextPage = page + 1;
      const moreGames = await fetchGames(searchQuery, nextPage);
      if (moreGames.length > 0) {
        setGamesList(prev => [...prev, ...moreGames]);
        setPage(nextPage);
      } else {
        setHasMore(false);
      }
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (game) => {
    setFavorites(prev => {
      const existingFavorite = prev.find(f => f.id === game.id);
      
      if (existingFavorite) {
        const newFavorites = prev.filter(f => f.id !== game.id);
        localStorage.setItem("favoriteGames", JSON.stringify(newFavorites));
        return newFavorites;
      } else {
        const gameToAdd = {
          id: game.id,
          title: game.title,
          coverUrl: game.coverUrl,
          rating: game.rating,
          releaseDate: game.released,
          platforms: game.platforms,
          genres: game.genres,
          description: game.description,
          dateAdded: new Date().toISOString(),
          userRating: ratings[game.id] || 0
        };
        const newFavorites = [...prev, gameToAdd];
        localStorage.setItem("favoriteGames", JSON.stringify(newFavorites));
        return newFavorites;
      }
    });
  };

  // Handle rating
  const handleRating = (gameId, rating) => {
    setRatings(prev => {
      const newRatings = { ...prev, [gameId]: rating };
      localStorage.setItem("gameRatings", JSON.stringify(newRatings));
      return newRatings;
    });
  };

  const isFavorite = (gameId) => {
    return favorites.some(f => f.id === gameId);
  };

  // Initial load
  useEffect(() => {
    fetchGames("", 1).then(games => setGamesList(games));
  }, []);

  return (
    <div className="games-container">
      <h1 className="text-3xl font-bold mb-6">🎮 Games</h1>

      {/* Search and Filters */}
      <div className="games-filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button" disabled={isLoading}>
            {isLoading ? "Searching..." : "🔍 Search"}
          </button>
        </form>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="relevance">Relevance</option>
          <option value="rating">Highest Rated</option>
          <option value="released">Recently Released</option>
        </select>
      </div>

      {/* Games Grid */}
      <div className="games-grid">
        {gamesList.map(game => (
          <div key={game.id} className="game-card">
            <div className="game-cover">
              <img
                src={game.coverUrl}
                alt={game.title}
                onClick={() => {
                  setSelectedGame(game);
                  setModalIsOpen(true);
                }}
              />
              <button
                className={`favorite-button ${isFavorite(game.id) ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(game);
                }}
              >
                {isFavorite(game.id) ? <FaHeart /> : <FaRegHeart />}
              </button>
            </div>
            <div className="game-content">
              <h3 className="game-title">{game.title}</h3>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <FaStar
                    key={star}
                    className={star <= (ratings[game.id] || 0) ? 'active' : ''}
                    onClick={() => handleRating(game.id, star)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLoading && <div className="loading">Loading...</div>}

      {hasMore && !isLoading && (
        <button onClick={loadMoreGames} className="load-more">
          Load More
        </button>
      )}

      {/* Game Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="game-modal"
        overlayClassName="ReactModal__Overlay"
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000
          }
        }}
      >
        {selectedGame && (
          <div className="modal-container">
            <button 
              onClick={() => setModalIsOpen(false)}
              className="close-button"
            >
              ×
            </button>

            <h2 className="game-modal-title">{selectedGame.title}</h2>
            <div className="game-modal-content">
              <div className="game-modal-cover-wrapper">
                <img
                  src={selectedGame.coverUrl}
                  alt={selectedGame.title}
                  className="game-modal-cover"
                />
                <button
                  className={`game-modal-favorite ${isFavorite(selectedGame.id) ? 'active' : ''}`}
                  onClick={() => handleToggleFavorite(selectedGame)}
                >
                  {isFavorite(selectedGame.id) ? 
                    <><FaHeart /> Favorited</> : 
                    <><FaRegHeart /> Add to Favorites</>
                  }
                </button>
              </div>
              <div className="game-modal-info">
                <p><strong>Release Date:</strong> {selectedGame.releaseDate}</p>
                <p><strong>Rating:</strong> {selectedGame.rating}/5</p>
                <p><strong>Platforms:</strong> {selectedGame.platforms.join(', ')}</p>
                <p><strong>Genres:</strong> {selectedGame.genres.join(', ')}</p>
                <div className="game-description">
                  <strong>Description:</strong>
                  <p>{selectedGame.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Games;
