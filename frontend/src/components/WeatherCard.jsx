const WeatherCard = ({ data }) => {
    const { location, current } = data;
  
    const getWeatherEmoji = (desc) => {
      if (desc.includes('Mưa')) return '🌧️';
      if (desc.includes('Nắng')) return '☀️';
      if (desc.includes('Tuyết')) return '❄️';
      if (desc.includes('Mây')) return '☁️';
      return '🌤️';
    };
  
    return (
      <div className="weather-card">
        <h2>{location.name}, {location.country}</h2>
        <p style={{ fontSize: '2rem' }}>
          {getWeatherEmoji(current.condition.text)} {current.temp_c}°C
        </p>
        <p>{current.condition.text}</p>
        <p>💧 Độ ẩm: {current.humidity}%</p>
        <p>💨 Gió: {current.wind_kph} km/h</p>
      </div>
    );
  };
  
  export default WeatherCard;
  