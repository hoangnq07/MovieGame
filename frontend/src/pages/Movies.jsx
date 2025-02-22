import { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import { FaStar } from "react-icons/fa"; // ⭐ Thư viện icon

const StarRating = ({ rating, onRate }) => {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {[...Array(5)].map((_, index) => {
        const currentRating = index + 1;
        return (
          <FaStar
            key={index}
            size={20}
            color={currentRating <= rating ? "#FFD700" : "#ccc"}
            style={{ cursor: "pointer" }}
            onClick={() => onRate(currentRating)}
          />
        );
      })}
    </div>
  );
};

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratings, setRatings] = useState(() => {
    const savedRatings = localStorage.getItem("movieRatings");
    return savedRatings ? JSON.parse(savedRatings) : {};
  });

  // 🔥 Fake API Call (Thay bằng API thật nếu có)
  const fetchMovies = async (pageNum) => {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=YOUR_API_KEY&page=${pageNum}`
    );
    const data = await res.json();
    return data.results;
  };

  useEffect(() => {
    loadMoreMovies();
  }, []);

  const loadMoreMovies = async () => {
    const newMovies = await fetchMovies(page);
    setMovies((prev) => [...prev, ...newMovies]);
    setPage((prev) => prev + 1);

    if (newMovies.length === 0) setHasMore(false); // Hết dữ liệu
  };

  const handleRating = (movieId, rating) => {
    const updatedRatings = { ...ratings, [movieId]: rating };
    setRatings(updatedRatings);
    localStorage.setItem("movieRatings", JSON.stringify(updatedRatings));
  };

  const filteredMovies = movies.filter((movie) =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      {/* 🔍 Thanh tìm kiếm */}
      <input
        type="text"
        placeholder="🔍 Tìm kiếm phim..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          margin: "20px",
          padding: "8px",
          width: "250px",
          borderRadius: "5px",
          border: "1px solid #ccc",
        }}
      />

      <h2>🎬 Danh Sách Phim Yêu Thích</h2>

      <InfiniteScroll
        dataLength={filteredMovies.length}
        next={loadMoreMovies}
        hasMore={hasMore}
        loader={<h4>Đang tải thêm...</h4>}
        endMessage={<p style={{ textAlign: "center" }}>🎉 Đã hết phim!</p>}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                width: "180px",
                margin: "10px",
                padding: "10px",
              }}
            >
              <LazyLoadImage
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                effect="blur"
                style={{
                  width: "100%",
                  borderRadius: "4px",
                  transition: "transform 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              />
              <h4>{movie.title}</h4>
              <p style={{ fontSize: "0.8rem", color: "#777" }}>
                {movie.release_date}
              </p>

              {/* ⭐ Đánh giá */}
              <StarRating
                rating={ratings[movie.id] || 0}
                onRate={(rate) => handleRating(movie.id, rate)}
              />
            </div>
          ))}
        </div>
      </InfiniteScroll>
    </div>
  );
};

export default Movies;
