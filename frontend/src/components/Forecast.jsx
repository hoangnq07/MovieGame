const Forecast = ({ forecast }) => {
    return (
      <div className="forecast">
        <h3>📅 Dự báo 3 ngày</h3>
        <div>
          {forecast.map((day) => (
            <div key={day.date} className="forecast-day">
              <p>{new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' })}</p>
              <img src={`https:${day.day.condition.icon}`} alt={day.day.condition.text} />
              <p>{day.day.avgtemp_c}°C</p>
              <p>{day.day.condition.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  export default Forecast;
  