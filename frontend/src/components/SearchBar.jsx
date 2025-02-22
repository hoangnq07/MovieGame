import { useState } from 'react';

const SearchBar = ({ onSearch, onGetLocation, toggleDarkMode, darkMode }) => {
  const [city, setCity] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (city.trim()) onSearch(city);
  };

  return (
    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Nhập tên thành phố..."
        />
        <button type="submit">Tìm</button>
      </form>

      {/* 📍 Nút Lấy Vị Trí */}
      <button className="toggle-mode" onClick={onGetLocation}>
        📍 Lấy Vị Trí Hiện Tại
      </button>

    </div>
  );
};

export default SearchBar;
