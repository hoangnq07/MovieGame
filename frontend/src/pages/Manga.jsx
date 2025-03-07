import { useState, useEffect, useCallback } from 'react';
import { FaHeart, FaRegHeart, FaStar } from 'react-icons/fa';
import Modal from "react-modal";
import "../styles/manga.css";

Modal.setAppElement("#root");

const Manga = () => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedManga, setSelectedManga] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mangaList, setMangaList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [ratings, setRatings] = useState(() => {
    const saved = localStorage.getItem("mangaRatings");
    return saved ? JSON.parse(saved) : {};
  });
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favoriteManga");
    return saved ? JSON.parse(saved) : [];
  });

  // Thêm states cho filters và sorting
  const [sortBy, setSortBy] = useState('latest');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDemographic, setFilterDemographic] = useState('');
  const [genres, setGenres] = useState([]);
  const [filterGenres, setFilterGenres] = useState([]);

  // Thêm state cho search options
  const [searchMode, setSearchMode] = useState('title'); // 'title' hoặc 'author'
  const [exactMatch, setExactMatch] = useState(false);

  // Định nghĩa các options cho filters
  const MANGA_STATUS = [
    { id: 'ongoing', name: 'Đang tiến hành' },
    { id: 'completed', name: 'Đã hoàn thành' },
    { id: 'hiatus', name: 'Tạm ngưng' },
    { id: 'cancelled', name: 'Đã hủy' }
  ];

  const DEMOGRAPHICS = [
    { id: 'shounen', name: 'Shounen' },
    { id: 'shoujo', name: 'Shoujo' },
    { id: 'seinen', name: 'Seinen' },
    { id: 'josei', name: 'Josei' }
  ];

  // Hàm helper để lấy title tiếng Việt
  const getVietnameseTitle = (titleObj, altTitles = {}) => {
    // Kiểm tra trong title chính
    if (titleObj.vi) return titleObj.vi;
    if (titleObj.vi_vn) return titleObj.vi_vn;
    
    // Kiểm tra trong altTitles
    if (altTitles) {
      // Tìm title tiếng Việt trong altTitles
      const viAltTitle = Object.values(altTitles).find(title => 
        title.vi || title.vi_vn
      );
      
      if (viAltTitle) {
        return viAltTitle.vi || viAltTitle.vi_vn;
      }
    }
    
    // Nếu không tìm thấy tiếng Việt, dùng tiếng Anh
    if (titleObj.en) return titleObj.en;
    
    // Cuối cùng lấy giá trị đầu tiên có sẵn
    const firstAvailableTitle = Object.values(titleObj)[0];
    return firstAvailableTitle || 'Không có tiêu đề';
  };

  // Hàm helper để lấy mô tả phù hợp
  const getDescription = (descriptionObj) => {
    if (!descriptionObj) return 'Chưa có mô tả';
    
    // Ưu tiên theo thứ tự: Tiếng Việt > Tiếng Anh > Ngôn ngữ khác
    return descriptionObj.vi || 
           descriptionObj.vi_vn || 
           descriptionObj.en || 
           Object.values(descriptionObj)[0] || 
           'Chưa có mô tả';
  };

  // Tối ưu hàm fetchManga
  const fetchManga = useCallback(async (query, pageNum = 1) => {
    try {
      setIsLoading(true);
      const offset = (pageNum - 1) * 12;
      
      // Base URL với các tham số cơ bản
      let url = `https://api.mangadex.org/manga?limit=12&offset=${offset}&includes[]=cover_art&includes[]=author`;
      
      // Xử lý tìm kiếm theo title hoặc author
      if (query) {
        if (searchMode === 'title') {
          // Tìm kiếm chính xác hoặc một phần theo title
          url += exactMatch 
            ? `&title=${encodeURIComponent(query)}`
            : `&title=${encodeURIComponent(query)}`;
        } else if (searchMode === 'author') {
          url += `&authors[]=${encodeURIComponent(query)}`;
        }
      }

      // Thêm order để sắp xếp kết quả theo độ phù hợp
      url += '&order[relevance]=desc';

      // Thêm các filter khác
      if (filterStatus) {
        url += `&status[]=${filterStatus}`;
      }
      if (filterDemographic) {
        url += `&publicationDemographic[]=${filterDemographic}`;
      }
      if (filterGenres.length > 0) {
        filterGenres.forEach(genreId => {
          url += `&includedTags[]=${genreId}`;
        });
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!data.data) {
        throw new Error('Invalid response format');
      }

      // Xử lý và format dữ liệu trả về
      return data.data.map(manga => ({
        ...manga,
        title: manga.attributes.title.en || manga.attributes.title.ja || Object.values(manga.attributes.title)[0],
        coverUrl: manga.relationships.find(rel => rel.type === 'cover_art')?.attributes?.fileName
          ? `https://uploads.mangadex.org/covers/${manga.id}/${manga.relationships.find(rel => rel.type === 'cover_art').attributes.fileName}`
          : null,
        author: manga.relationships.find(rel => rel.type === 'author')?.attributes?.name || 'Unknown Author'
      }));

    } catch (err) {
      console.error('Error fetching manga:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [searchMode, exactMatch, filterStatus, filterDemographic, filterGenres]);

  // Load thêm manga
  const loadMoreManga = async () => {
    if (!isLoading) {
      const nextPage = page + 1;
      const moreManga = await fetchManga(searchQuery, nextPage);
      if (moreManga && moreManga.length > 0) {
        setMangaList(prev => [...prev, ...moreManga]);
        setPage(nextPage);
      } else {
        setHasMore(false);
      }
    }
  };

  // Toggle yêu thích
  const handleToggleFavorite = (manga) => {
    setFavorites(prev => {
      const existingFavorite = prev.find(f => f.id === manga.id);
      
      if (existingFavorite) {
        const newFavorites = prev.filter(f => f.id !== manga.id);
        localStorage.setItem("favoriteManga", JSON.stringify(newFavorites));
        return newFavorites;
      } else {
        const mangaToAdd = {
          id: manga.id,
          title: manga.title,
          coverUrl: manga.coverUrl,
          description: manga.description,
          tags: manga.tags,
          status: manga.status,
          dateAdded: new Date().toISOString(),
          userRating: ratings[manga.id] || 0
        };
        const newFavorites = [...prev, mangaToAdd];
        localStorage.setItem("favoriteManga", JSON.stringify(newFavorites));
        return newFavorites;
      }
    });
  };

  // Xử lý đánh giá
  const handleRating = (mangaId, rating) => {
    setRatings(prev => {
      const newRatings = { ...prev, [mangaId]: rating };
      localStorage.setItem("mangaRatings", JSON.stringify(newRatings));
      return newRatings;
    });
  };

  // Kiểm tra manga có được yêu thích không
  const isFavorite = (mangaId) => {
    return favorites.some(item => item.id === mangaId);
  };

  // Load manga ban đầu
  useEffect(() => {
    const loadInitialManga = async () => {
      const initialManga = await fetchManga();
      setMangaList(initialManga);
    };
    loadInitialManga();
  }, []);

  // Thêm useEffect để reload khi filters thay đổi
  useEffect(() => {
    setMangaList([]); // Reset manga list
    setPage(1); // Reset page
    fetchManga(searchQuery).then(data => {
      setMangaList(data);
    });
  }, [sortBy, filterStatus, filterDemographic, filterGenres, searchQuery]);

  // Xử lý search
  const handleSearch = async (e) => {
    e.preventDefault();
    setMangaList([]); // Reset manga list
    setPage(1); // Reset page
    setHasMore(true); // Reset hasMore
    const results = await fetchManga(searchQuery, 1);
    setMangaList(results);
  };

  // Cập nhật search query
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Fetch tất cả thể loại khi component mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch('https://api.mangadex.org/manga/tag');
        const data = await response.json();
        
        // Lọc và format tags thành genres
        const formattedGenres = data.data
          .filter(tag => tag.attributes.group === 'genre') // Chỉ lấy các tag thuộc nhóm genre
          .map(tag => ({
            id: tag.id,
            name: tag.attributes.name.vi || tag.attributes.name.en // Ưu tiên tên tiếng Việt
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sắp xếp theo alphabet

        setGenres(formattedGenres);
      } catch (error) {
        console.error('Error fetching genres:', error);
      }
    };

    fetchGenres();
  }, []);

  // Toggle genre selection
  const handleGenreToggle = (genreId) => {
    setFilterGenres(prev => {
      const newGenres = prev.includes(genreId) 
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId];
      return newGenres;
    });
    setPage(1); // Reset page về 1 khi thay đổi filter
  };

  // Reset all filters
  const resetFilters = () => {
    setFilterGenres([]);
    setFilterStatus('');
    setFilterDemographic('');
    setSortBy('latest');
    setSearchQuery('');
  };

  return (
    <div className="manga-container">
      <h1 className="text-3xl font-bold mb-6">📚 Manga</h1>
      
      <div className="manga-filters">
        <div className="search-section">
          <div className="search-options">
            <select 
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value)}
              className="search-mode-select"
            >
              <option value="title">Tìm theo tên</option>
              <option value="author">Tìm theo tác giả</option>
            </select>
            
            <label className="exact-match-label">
              <input
                type="checkbox"
                checked={exactMatch}
                onChange={(e) => setExactMatch(e.target.checked)}
              />
              Tìm chính xác
            </label>
          </div>

          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder={searchMode === 'title' ? "Tìm kiếm manga..." : "Tìm theo tên tác giả..."}
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
              />
              <button 
                type="submit" 
                className="search-button"
                disabled={isLoading}
              >
                {isLoading ? "Đang tìm..." : "🔍 Tìm"}
              </button>
            </div>
          </form>
        </div>

        {/* Filters */}
        <div className="filters-section">
          {/* Sort selection */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="latest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="title_asc">Tên A-Z</option>
            <option value="title_desc">Tên Z-A</option>
            <option value="rating">Đánh giá cao nhất</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">Tất cả trạng thái</option>
            {MANGA_STATUS.map(status => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>

          {/* Demographic filter */}
          <select
            value={filterDemographic}
            onChange={(e) => setFilterDemographic(e.target.value)}
            className="filter-select"
          >
            <option value="">Tất cả đối tượng</option>
            {DEMOGRAPHICS.map(demo => (
              <option key={demo.id} value={demo.id}>
                {demo.name}
              </option>
            ))}
          </select>

          {/* Reset filters button */}
          <button 
            onClick={resetFilters}
            className="reset-filters-btn"
          >
            Đặt lại bộ lọc
          </button>
        </div>

        {/* Genres grid */}
        <div className="genres-section">
          <h4>Thể loại:</h4>
          <div className="genres-grid">
            {genres.map(genre => (
              <button
                key={genre.id}
                onClick={() => handleGenreToggle(genre.id)}
                className={`genre-tag ${filterGenres.includes(genre.id) ? 'active' : ''}`}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="manga-grid">
        {mangaList.map(manga => (
          <div key={manga.id} className="manga-card">
            <div className="manga-cover">
              <img
                src={manga.coverUrl}
                alt={manga.title}
                onClick={() => {
                  setSelectedManga(manga);
                  setModalIsOpen(true);
                }}
              />
              <button
                className={`favorite-button ${isFavorite(manga.id) ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(manga);
                }}
              >
                {isFavorite(manga.id) ? <FaHeart /> : <FaRegHeart />}
              </button>
            </div>
            <div className="manga-content">
              <h3 className="manga-title">{manga.title}</h3>
              
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <FaStar
                    key={star}
                    className={star <= (ratings[manga.id] || 0) ? 'active' : ''}
                    onClick={() => handleRating(manga.id, star)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLoading && <div className="loading">Đang tải...</div>}

      {hasMore && !isLoading && (
        <button onClick={loadMoreManga} className="load-more">
          Tải thêm
        </button>
      )}

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="manga-modal"
        overlayClassName="ReactModal__Overlay"
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000
          }
        }}
      >
        {selectedManga && (
          <div className="modal-container">
            {/* Nút đóng */}
            <button 
              onClick={() => setModalIsOpen(false)}
              className="close-button"
            >
              ×
            </button>

            {/* Nội dung modal */}
            <h2 className="manga-modal-title">{selectedManga.title}</h2>
            <div className="manga-modal-content">
              <div className="manga-modal-cover-wrapper">
                <img
                  src={selectedManga.coverUrl}
                  alt={selectedManga.title}
                  className="manga-modal-cover"
                />
                <button
                  className={`manga-modal-favorite ${isFavorite(selectedManga.id) ? 'active' : ''}`}
                  onClick={() => handleToggleFavorite(selectedManga)}
                >
                  {isFavorite(selectedManga.id) ? 
                    <><FaHeart /> Đã yêu thích</> : 
                    <><FaRegHeart /> Thêm vào yêu thích</>
                  }
                </button>
              </div>
              <div className="manga-modal-info">
                {/* Kiểm tra tồn tại của tags trước khi map */}
                {selectedManga.attributes?.tags && (
                  <div className="manga-modal-tags">
                    {selectedManga.attributes.tags.map((tag, index) => (
                      <span key={index} className="manga-tag">
                        {tag.attributes?.name?.en || tag.attributes?.name?.ja || 'Unknown'}
                      </span>
                    ))}
                  </div>
                )}
                
                <p>
                  <strong>Trạng thái:</strong> {' '}
                  {selectedManga.attributes?.status 
                    ? selectedManga.attributes.status.charAt(0).toUpperCase() + 
                      selectedManga.attributes.status.slice(1)
                    : 'Không rõ'}
                </p>
                
                {selectedManga.attributes?.year && (
                  <p><strong>Năm phát hành:</strong> {selectedManga.attributes.year}</p>
                )}
                
                {selectedManga.attributes?.description && (
                  <div className="manga-description">
                    <strong>Mô tả:</strong>
                    <p>{getDescription(selectedManga.attributes.description)}</p>
                  </div>
                )}
                
                
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Manga;
