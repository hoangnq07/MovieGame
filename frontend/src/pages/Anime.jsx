import { useEffect, useState } from "react";
import { FaStar, FaHeart, FaRegHeart, FaSortAmountDown } from "react-icons/fa";
import Modal from "react-modal";

Modal.setAppElement("#root"); // Tránh cảnh báo Accessibility

const Anime = () => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState(null);

  const [searchQuery, setSearchQuery] = useState("Naruto");
  const [animeList, setAnimeList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [ratings, setRatings] = useState(
    () => JSON.parse(localStorage.getItem("animeRatings")) || {}
  );
  const [favorites, setFavorites] = useState(
    () => JSON.parse(localStorage.getItem("favoriteAnime")) || []
  );
  const [sortOption, setSortOption] = useState("default");
  const openModal = (anime) => {
    setSelectedAnime(anime);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedAnime(null);
  };

  // 🔥 Fetch Anime từ Jikan API
  const fetchAnime = async (query, pageNum = 1) => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `https://api.jikan.moe/v4/anime?q=${query}&page=${pageNum}&limit=12`
      );

      if (res.status === 429) {
        console.warn("⚠️ Too Many Requests. Retrying in 2 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return fetchAnime(query, pageNum);
      }

      const data = await res.json();
      return data.data || [];
    } catch (err) {
      console.error("Lỗi khi fetch anime:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // 📋 Tìm kiếm khi người dùng nhấn nút "Tìm"
  const handleSearch = async () => {
    setPage(1);
    setHasMore(true);
    const newAnime = await fetchAnime(searchQuery, 1);
    setAnimeList(newAnime);
  };

  // 🔄 Tải thêm Anime
  const loadMoreAnime = async () => {
    const moreAnime = await fetchAnime(searchQuery, page + 1);
    if (moreAnime.length === 0) {
      setHasMore(false);
    } else {
      setAnimeList((prev) => [...prev, ...moreAnime]);
      setPage((prev) => prev + 1);
    }
  };

  // ⭐ Đánh Giá Anime
  const handleRating = (animeId, rating) => {
    const updatedRatings = { ...ratings, [animeId]: rating };
    setRatings(updatedRatings);
    localStorage.setItem("animeRatings", JSON.stringify(updatedRatings));
  };

  // ❤️ Thêm/Bỏ Anime Yêu Thích
  const toggleFavorite = (anime) => {
    let updatedFavorites;
    if (favorites.some((fav) => fav.mal_id === anime.mal_id)) {
      updatedFavorites = favorites.filter((fav) => fav.mal_id !== anime.mal_id);
    } else {
      updatedFavorites = [...favorites, anime];
    }
    setFavorites(updatedFavorites);
    localStorage.setItem("favoriteAnime", JSON.stringify(updatedFavorites));
  };

  const isFavorite = (animeId) =>
    favorites.some((fav) => fav.mal_id === animeId);

  // 📊 Sắp Xếp Danh Sách Anime
  const sortAnimeList = (option) => {
    let sortedList = [...animeList];
    if (option === "score") {
      sortedList.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (option === "year") {
      sortedList.sort(
        (a, b) =>
          (b.aired?.prop?.from?.year || 0) - (a.aired?.prop?.from?.year || 0)
      );
    }
    setAnimeList(sortedList);
    setSortOption(option);
  };

  // 🎯 Gợi Ý Anime Dựa Trên Yêu Thích
  const suggestAnime = () => {
    if (favorites.length === 0) return alert("💡 Hãy thêm một vài anime yêu thích trước!");
  
    // 🎯 Lấy random anime yêu thích để làm mốc so sánh
    const baseAnime = favorites[Math.floor(Math.random() * favorites.length)];
  
    // 🔎 Tìm anime có điểm và thể loại tương đồng
    const similarAnime = animeList.filter((anime) => {
      // Kiểm tra điểm số (chênh lệch dưới 1 điểm)
      const scoreSimilar = Math.abs((anime.score || 0) - (baseAnime.score || 0)) <= 1;
  
      // Kiểm tra thể loại trùng
      const baseGenres = baseAnime.genres.map((g) => g.name);
      const animeGenres = anime.genres.map((g) => g.name);
      const commonGenres = baseGenres.filter((genre) => animeGenres.includes(genre));
  
      return scoreSimilar && commonGenres.length > 0;
    });
  
    if (similarAnime.length > 0) {
      const randomIndex = Math.floor(Math.random() * similarAnime.length);
      alert(`🎉 Gợi ý thử xem: ${similarAnime[randomIndex].title}`);
    } else {
      alert("😢 Không tìm thấy anime nào tương đồng. Thử tìm kiếm thêm!");
    }
  };
  

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>📺 Danh Sách Anime</h2>

      {/* 🔍 Tìm Kiếm */}
      <input
        type="text"
        placeholder="Nhập tên anime..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          margin: "10px",
          padding: "8px",
          width: "250px",
          borderRadius: "5px",
          border: "1px solid #ccc",
        }}
      />
      <button
        onClick={handleSearch}
        style={{ padding: "8px 12px", marginLeft: "5px" }}
      >
        🔍 Tìm
      </button>

      {/* 📊 Sắp Xếp */}
      <select
        onChange={(e) => sortAnimeList(e.target.value)}
        value={sortOption}
        style={{ marginLeft: "10px", padding: "5px" }}
      >
        <option value="default">Sắp xếp theo...</option>
        <option value="score">⭐ Điểm Số (cao → thấp)</option>
        <option value="year">📅 Năm Phát Hành (mới → cũ)</option>
      </select>

      {/* 🎯 Gợi Ý Anime */}
      <button
        onClick={suggestAnime}
        style={{ marginLeft: "10px", padding: "8px" }}
      >
        🎲 Gợi Ý Anime
      </button>

      {/* 🖼️ Danh sách Anime */}
      {isLoading && <p>⏳ Đang tải dữ liệu...</p>}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: "20px",
        }}
      >
        {animeList.map((anime) => (
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
            {/* Ảnh Anime */}
            <img
              src={anime.images.jpg.image_url}
              alt={anime.title}
              style={{ width: "100%", borderRadius: "4px", cursor: "pointer" }}
              onClick={() => openModal(anime)} // ✅ Thêm hàm mở Modal
            />

            {/* ❤️ Nút Yêu Thích */}
            <div
              onClick={() => toggleFavorite(anime)}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                cursor: "pointer",
              }}
            >
              {isFavorite(anime.mal_id) ? (
                <FaHeart size={20} color="red" />
              ) : (
                <FaRegHeart size={20} color="#ccc" />
              )}
            </div>

            <h4>{anime.title}</h4>
            <p>{anime.aired?.prop?.from?.year || "N/A"}</p>
            <p>⭐ Điểm: {anime.score || "?"}</p>

            {/* ⭐ Đánh Giá (1-5 sao) */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              {[...Array(5)].map((_, index) => {
                const currentRating = index + 1;
                return (
                  <FaStar
                    key={index}
                    size={20}
                    color={
                      currentRating <= (ratings[anime.mal_id] || 0)
                        ? "#FFD700"
                        : "#ccc"
                    }
                    style={{ cursor: "pointer" }}
                    onClick={() => handleRating(anime.mal_id, currentRating)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ✅ Nút Tải Thêm */}
      {hasMore && animeList.length > 0 && (
        <button
          onClick={loadMoreAnime}
          style={{ marginTop: "20px", padding: "10px 20px" }}
        >
          ➕ Tải Thêm
        </button>
      )}

      {/* ⚠️ Không có kết quả */}
      {!isLoading && animeList.length === 0 && (
        <p>😢 Không tìm thấy anime nào.</p>
      )}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Chi tiết Anime"
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            transform: "translate(-50%, -50%)",
            width: "400px",
            borderRadius: "10px",
            padding: "20px",
          },
        }}
      >
        {selectedAnime && (
          <div>
            <h2>{selectedAnime.title}</h2>
            <img
              src={selectedAnime.images.jpg.image_url}
              alt={selectedAnime.title}
              style={{ width: "100%", borderRadius: "5px" }}
            />
            <p>
              <strong>Thể loại:</strong>{" "}
              {selectedAnime.genres.map((g) => g.name).join(", ")}
            </p>
            <p>
              <strong>Số tập:</strong> {selectedAnime.episodes || "?"}
            </p>
            <p>
              <strong>Ngày phát hành:</strong>{" "}
              {selectedAnime.aired?.prop?.from?.year || "N/A"}
            </p>
            <p>
              <strong>Điểm MAL:</strong> {selectedAnime.score || "?"}
            </p>
            <button onClick={closeModal} style={{ marginTop: "10px" }}>
              Đóng
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Anime;
