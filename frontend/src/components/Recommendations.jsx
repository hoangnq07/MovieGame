import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trackingService } from '../services/trackingService';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

const Recommendations = () => {
  const [recommendations, setRecommendations] = useState({
    movies: [],
    games: [],
    books: [],
    anime: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      // Lấy user interactions từ local
      const interactions = trackingService.getLocalInteractions();
      const userId = trackingService.getUserIdentifier();

      // Gọi API để lấy recommendations
      const response = await fetch(`/api/recommendations?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ interactions })
      });

      if (!response.ok) throw new Error('Failed to fetch recommendations');
      
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading recommendations...</div>;
  }

  return (
    <div className="recommendations-container">
      {Object.entries(recommendations).map(([category, items]) => {
        if (!items.length) return null;

        return (
          <div key={category} className="recommendation-section">
            <h3 className="section-title">
              {category === 'movies' && '🎬 Phim đề xuất'}
              {category === 'games' && '🎮 Game đề xuất'}
              {category === 'books' && '📚 Sách đề xuất'}
              {category === 'anime' && '📺 Anime đề xuất'}
            </h3>
            <div className="recommendations-grid">
              {items.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  to={`/${category}?id=${item.id}`}
                  className="recommendation-card"
                  onClick={() => trackingService.trackInteraction(
                    item.id,
                    category,
                    trackingService.INTERACTION_TYPES.CLICK
                  )}
                >
                  <LazyLoadImage
                    src={item.imageUrl}
                    alt={item.title}
                    effect="blur"
                    className="recommendation-image"
                  />
                  <div className="recommendation-info">
                    <h4>{item.title}</h4>
                    <div className="recommendation-meta">
                      <span className="priority-score">
                        ⭐ {item.priorityScore.toFixed(1)}
                      </span>
                      {item.matchScore && (
                        <span className="match-score">
                          {(item.matchScore * 100).toFixed(0)}% match
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Recommendations;
