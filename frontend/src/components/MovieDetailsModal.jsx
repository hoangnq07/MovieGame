import { useState, useEffect } from 'react';
import { FaPlay, FaTimes, FaStar, FaUser } from 'react-icons/fa';

const MovieDetailsModal = ({ movieId, onClose }) => {
  const [details, setDetails] = useState(null);
  const [credits, setCredits] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [trailerKey, setTrailerKey] = useState(null);

  useEffect(() => {
    fetchMovieDetails();
    fetchCredits();
    fetchSimilarMovies();
    fetchReviews();
    fetchTrailer();
  }, [movieId]);

  const fetchMovieDetails = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=vi-VN`
      );
      const data = await response.json();
      setDetails(data);
    } catch (error) {
      console.error('Error fetching movie details:', error);
    }
  };

  const fetchCredits = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}`
      );
      const data = await response.json();
      setCredits(data);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchSimilarMovies = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/similar?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=vi-VN`
      );
      const data = await response.json();
      setSimilar(data.results.slice(0, 6));
    } catch (error) {
      console.error('Error fetching similar movies:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/reviews?api_key=${import.meta.env.VITE_TMDB_API_KEY}`
      );
      const data = await response.json();
      setReviews(data.results);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchTrailer = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${import.meta.env.VITE_TMDB_API_KEY}`
      );
      const data = await response.json();
      const trailer = data.results.find(video => video.type === 'Trailer');
      if (trailer) {
        setTrailerKey(trailer.key);
      }
    } catch (error) {
      console.error('Error fetching trailer:', error);
    }
  };

  if (!details) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          <FaTimes />
        </button>

        <div className="movie-header">
          <div className="movie-main-info">
            <div className="movie-poster-container">
              <img
                src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
                alt={details.title}
                className="movie-poster"
              />
              {trailerKey && (
                <button className="trailer-button" onClick={() => window.open(`https://www.youtube.com/watch?v=${trailerKey}`, '_blank')}>
                  <FaPlay /> Xem Trailer
                </button>
              )}
            </div>
            
            <div className="movie-info">
              <h2>{details.title}</h2>
              <div className="movie-meta">
                <span>⭐ {details.vote_average.toFixed(1)}/10</span>
                <span>📅 {new Date(details.release_date).toLocaleDateString('vi-VN')}</span>
                <span>⏱️ {details.runtime} phút</span>
              </div>
              <div className="genres">
                {details.genres.map(genre => (
                  <span key={genre.id} className="genre-tag">
                    {genre.name}
                  </span>
                ))}
              </div>
              <div className="movie-description">
                <h3>Nội dung phim</h3>
                <p>{details.overview}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="tabs">
          <button
            className={activeTab === 'info' ? 'active' : ''}
            onClick={() => setActiveTab('info')}
          >
            Thông tin
          </button>
          <button
            className={activeTab === 'cast' ? 'active' : ''}
            onClick={() => setActiveTab('cast')}
          >
            Diễn viên
          </button>
          <button
            className={activeTab === 'similar' ? 'active' : ''}
            onClick={() => setActiveTab('similar')}
          >
            Phim tương tự
          </button>
          <button
            className={activeTab === 'reviews' ? 'active' : ''}
            onClick={() => setActiveTab('reviews')}
          >
            Đánh giá
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'info' && (
            <div>
              <h3>Thể loại</h3>
              <div className="genres">
                {details.genres.map(genre => (
                  <span key={genre.id} className="genre-tag">
                    {genre.name}
                  </span>
                ))}
              </div>
              
              <h3>Công ty sản xuất</h3>
              <div className="production-companies">
                {details.production_companies.map(company => (
                  <div key={company.id} className="company">
                    {company.logo_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w200${company.logo_path}`}
                        alt={company.name}
                      />
                    )}
                    <p>{company.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cast' && credits && (
            <div className="cast-grid">
              {credits.cast.slice(0, 12).map(person => (
                <div key={person.id} className="cast-card">
                  {person.profile_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w200${person.profile_path}`}
                      alt={person.name}
                    />
                  ) : (
                    <div className="no-photo">
                      <FaUser />
                    </div>
                  )}
                  <h4>{person.name}</h4>
                  <p>{person.character}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'similar' && (
            <div className="similar-grid">
              {similar.map(movie => (
                <div key={movie.id} className="similar-card">
                  <img
                    src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                    alt={movie.title}
                  />
                  <h4>{movie.title}</h4>
                  <p>⭐ {movie.vote_average.toFixed(1)}/10</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="reviews-list">
              {reviews.length > 0 ? (
                reviews.map(review => (
                  <div key={review.id} className="review-card">
                    <div className="review-header">
                      <h4>{review.author}</h4>
                      <p>{new Date(review.created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <p>{review.content}</p>
                  </div>
                ))
              ) : (
                <p>Chưa có đánh giá nào.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieDetailsModal;
