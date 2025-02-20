import { useState } from 'react';
import SearchBar from './SearchBar';
import WeatherCard from './WeatherCard';
import Forecast from './Forecast';
import { fetchWeather, fetchWeatherByCoords } from '../api';

const WeatherApp = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  // 🔍 Tìm kiếm theo tên thành phố
  const handleSearch = async (city) => {
    try {
      setError('');
      const data = await fetchWeather(city);
      setWeatherData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // 📍 Lấy vị trí hiện tại
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('⚠️ Trình duyệt không hỗ trợ lấy vị trí');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          setError('');
          const { latitude, longitude } = position.coords;
          const data = await fetchWeatherByCoords(latitude, longitude);
          setWeatherData(data);
        } catch (err) {
          setError(err.message);
        }
      },
      () => {
        setError('⚠️ Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập!');
      }
    );
  };

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <div className={darkMode ? 'dark-mode' : ''}>
      <div className="container">
        <h1>🌤️ Weather App</h1>
        <SearchBar
          onSearch={handleSearch}
          onGetLocation={handleGetLocation}
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
        />

        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

        {weatherData && (
          <>
            <WeatherCard data={weatherData} />
            <Forecast forecast={weatherData.forecast.forecastday} />
          </>
        )}
      </div>
    </div>
  );
};

export default WeatherApp;
