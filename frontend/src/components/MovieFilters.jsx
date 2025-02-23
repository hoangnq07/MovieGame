import { useState } from 'react';

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

const MovieFilters = ({ onFilterChange }) => {
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [yearRange, setYearRange] = useState({ start: 1900, end: new Date().getFullYear() });
  const [sortBy, setSortBy] = useState('popularity.desc');

  const handleGenreChange = (genreId) => {
    const updatedGenres = selectedGenres.includes(genreId)
      ? selectedGenres.filter(id => id !== genreId)
      : [...selectedGenres, genreId];
    setSelectedGenres(updatedGenres);
    onFilterChange({ genres: updatedGenres, yearRange, sortBy });
  };

  const handleYearChange = (type, value) => {
    const updated = { ...yearRange, [type]: value };
    setYearRange(updated);
    onFilterChange({ genres: selectedGenres, yearRange: updated, sortBy });
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    onFilterChange({ genres: selectedGenres, yearRange, sortBy: value });
  };

  return (
    <div className="filters-container">
      <h3>Bộ lọc</h3>
      
      <div className="filter-section">
        <h4>Thể loại:</h4>
        <div className="genres-grid">
          {GENRES.map(genre => (
            <button
              key={genre.id}
              onClick={() => handleGenreChange(genre.id)}
              className={`genre-button ${selectedGenres.includes(genre.id) ? 'selected' : ''}`}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h4>Năm:</h4>
        <div className="year-range">
          <input
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            value={yearRange.start}
            onChange={(e) => handleYearChange('start', parseInt(e.target.value))}
            className="year-input"
          />
          <span>đến</span>
          <input
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            value={yearRange.end}
            onChange={(e) => handleYearChange('end', parseInt(e.target.value))}
            className="year-input"
          />
        </div>
      </div>

      <div className="filter-section">
        <h4>Sắp xếp theo:</h4>
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className="sort-select"
        >
          <option value="popularity.desc">Phổ biến (Cao → Thấp)</option>
          <option value="popularity.asc">Phổ biến (Thấp → Cao)</option>
          <option value="vote_average.desc">Đánh giá (Cao → Thấp)</option>
          <option value="vote_average.asc">Đánh giá (Thấp → Cao)</option>
          <option value="release_date.desc">Mới nhất</option>
          <option value="release_date.asc">Cũ nhất</option>
        </select>
      </div>
    </div>
  );
};

export default MovieFilters;
