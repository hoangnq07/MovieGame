import { useEffect, useState } from "react";
import { Pie, Bar } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const AnimeStats = () => {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem("favoriteAnime");
    setFavorites(savedFavorites ? JSON.parse(savedFavorites) : []);
  }, []);

  // ✅ Thống kê thể loại
  const genreCount = favorites.reduce((acc, anime) => {
    anime.genres.forEach((genre) => {
      acc[genre.name] = (acc[genre.name] || 0) + 1;
    });
    return acc;
  }, {});

  const data = {
    labels: Object.keys(genreCount),
    datasets: [
      {
        label: "Thể loại yêu thích",
        data: Object.values(genreCount),
        backgroundColor: [
          "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#E7E9ED",
        ],
      },
    ],
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>📊 Thống Kê Thể Loại Anime Yêu Thích</h2>

      {favorites.length > 0 ? (
        <>
          <div style={{ width: "400px", margin: "0 auto" }}>
            <Pie data={data} />
          </div>

          <div style={{ width: "600px", margin: "40px auto" }}>
            <Bar data={data} />
          </div>
        </>
      ) : (
        <p>😢 Chưa có dữ liệu thống kê.</p>
      )}
    </div>
  );
};

export default AnimeStats;
