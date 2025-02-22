import { useEffect, useState } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { FaTrash } from "react-icons/fa";

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem("favoriteAnime");
    setFavorites(savedFavorites ? JSON.parse(savedFavorites) : []);
  }, []);

  const removeFavorite = (animeId) => {
    const updatedFavorites = favorites.filter((fav) => fav.mal_id !== animeId);
    setFavorites(updatedFavorites);
    localStorage.setItem("favoriteAnime", JSON.stringify(updatedFavorites));
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>❤️ Anime Yêu Thích</h2>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
        {favorites.map((anime) => (
          <div
            key={anime.mal_id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              width: "180px",
              margin: "10px",
              padding: "10px",
              textAlign: "center",
              position: "relative",
            }}
          >
            <LazyLoadImage
              src={anime.images.jpg.image_url}
              alt={anime.title}
              effect="blur"
              style={{ width: "100%", borderRadius: "4px" }}
            />
            <h4>{anime.title}</h4>
            <button onClick={() => removeFavorite(anime.mal_id)} style={{ marginTop: "5px" }}>
              <FaTrash /> Xóa
            </button>
          </div>
        ))}
      </div>
      {favorites.length === 0 && <p>😢 Chưa có anime nào yêu thích.</p>}
    </div>
  );
};

export default Favorites;
