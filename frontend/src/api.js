const API_KEY = '07bfe9963ac94aa686693859252002'; // 🔑 Thay bằng API Key thật


// 📡 Gọi API theo tên thành phố
export const fetchWeather = async (query) => {
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${query}&days=3&lang=vi`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không tìm thấy thành phố');
  return res.json();
};

// 📡 Gọi API theo tọa độ (lat, lon)
export const fetchWeatherByCoords = async (lat, lon) => {
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=3&lang=vi`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không thể lấy thời tiết theo vị trí');
  return res.json();
};
