import { useEffect, useState } from "react";
import { Pie, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
} from "chart.js";
import { FaChartPie, FaChartLine, FaChartBar } from "react-icons/fa";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

const Stats = () => {
  // State cho Movie
  const [movieFavorites, setMovieFavorites] = useState([]);
  const [movieRatings, setMovieRatings] = useState({});
  
  // State cho Anime
  const [animeFavorites, setAnimeFavorites] = useState([]);
  const [animeRatings, setAnimeRatings] = useState({});

  useEffect(() => {
    // Load Movie data
    const savedMovieFavorites = localStorage.getItem("favoriteMovies");
    const savedMovieRatings = localStorage.getItem("movieRatings");
    
    setMovieFavorites(savedMovieFavorites ? JSON.parse(savedMovieFavorites) : []);
    setMovieRatings(savedMovieRatings ? JSON.parse(savedMovieRatings) : {});

    // Load Anime data
    const savedAnimeFavorites = localStorage.getItem("favoriteAnime");
    const savedAnimeRatings = localStorage.getItem("animeRatings");
    
    setAnimeFavorites(savedAnimeFavorites ? JSON.parse(savedAnimeFavorites) : []);
    setAnimeRatings(savedAnimeRatings ? JSON.parse(savedAnimeRatings) : {});
  }, []);

  // Tính toán thống kê tổng quan
  const stats = {
    totalItems: movieFavorites.length + animeFavorites.length,
    totalMovies: movieFavorites.length,
    totalAnime: animeFavorites.length,
    ratedMovies: Object.keys(movieRatings).length,
    ratedAnime: Object.keys(animeRatings).length,
    averageMovieRating: Object.values(movieRatings).length > 0
      ? (Object.values(movieRatings).reduce((a, b) => a + b, 0) / Object.values(movieRatings).length).toFixed(1)
      : 0,
    averageAnimeRating: Object.values(animeRatings).length > 0
      ? (Object.values(animeRatings).reduce((a, b) => a + b, 0) / Object.values(animeRatings).length).toFixed(1)
      : 0
  };

  // Thống kê theo năm
  const getYearStats = () => {
    const yearStats = {};
    
    movieFavorites.forEach(movie => {
      const year = new Date(movie.release_date).getFullYear();
      yearStats[year] = yearStats[year] || { movies: 0, anime: 0 };
      yearStats[year].movies++;
    });

    animeFavorites.forEach(anime => {
      const year = anime.aired?.prop?.from?.year;
      if (year) {
        yearStats[year] = yearStats[year] || { movies: 0, anime: 0 };
        yearStats[year].anime++;
      }
    });

    return yearStats;
  };

  // Điều chỉnh options chung cho biểu đồ
  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Thay đổi thành false
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 10,
          padding: 5,
          font: { size: 10 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 5,
        titleFont: { size: 10 },
        bodyFont: { size: 10 }
      }
    }
  };

  // Thêm options riêng cho line chart
  const lineChartOptions = {
    ...commonChartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 10
          }
        }
      },
      x: {
        ticks: {
          font: {
            size: 10
          }
        }
      }
    }
  };

  // Data cho biểu đồ phân bố theo năm
  const yearData = {
    labels: Object.keys(getYearStats()).sort(),
    datasets: [
      {
        label: "Phim",
        data: Object.keys(getYearStats()).sort().map(year => getYearStats()[year].movies),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        tension: 0.3 // Làm mượt đường line
      },
      {
        label: "Anime",
        data: Object.keys(getYearStats()).sort().map(year => getYearStats()[year].anime),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        tension: 0.3
      }
    ]
  };

  // Data cho biểu đồ rating
  const getRatingData = (ratings) => {
    const ratingStats = Object.values(ratings).reduce((acc, rating) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: ["1 sao", "2 sao", "3 sao", "4 sao", "5 sao"],
      datasets: [{
        data: [1, 2, 3, 4, 5].map(star => ratingStats[star] || 0),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
        ],
      }],
    };
  };

  // Thêm hàm mới để tính rating phổ biến nhất
  const getMostCommonRating = (ratings) => {
    const ratingCounts = Object.values(ratings).reduce((acc, rating) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {});

    if (Object.keys(ratingCounts).length === 0) return 'N/A';

    const mostCommon = Object.entries(ratingCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    return `${mostCommon[0]} sao (${mostCommon[1]} lần)`;
  };

  return (
    <div className="stats-container">
      <h2>📊 Thống Kê Tổng Hợp</h2>

      <div className="stats-summary">
        <div className="stat-card">
          <h3>Tổng số mục yêu thích</h3>
          <p>{stats.totalItems}</p>
          <div className="stat-details">
            <span>🎬 Phim: {stats.totalMovies}</span>
            <span>📺 Anime: {stats.totalAnime}</span>
          </div>
        </div>
        <div className="stat-card">
          <h3>Đã đánh giá</h3>
          <p>{stats.ratedMovies + stats.ratedAnime}</p>
          <div className="stat-details">
            <span>🎬 Phim: {stats.ratedMovies}</span>
            <span>📺 Anime: {stats.ratedAnime}</span>
          </div>
        </div>
        <div className="stat-card">
          <h3>Điểm trung bình</h3>
          <div className="stat-details">
            <span>🎬 Phim: ⭐ {stats.averageMovieRating}/5</span>
            <span>📺 Anime: ⭐ {stats.averageAnimeRating}/5</span>
          </div>
        </div>
      </div>

      {stats.totalItems > 0 ? (
        <div className="charts-grid">
          {/* Line Chart */}
          <div className="chart-box line-chart">
            <h3>Phân Bố Theo Năm</h3>
            <div style={{ height: '300px', width: '100%' }}>
              <Line 
                data={yearData}
                options={{
                  ...commonChartOptions,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                        font: { size: 10 }
                      }
                    },
                    x: {
                      ticks: {
                        font: { size: 10 }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Pie Charts */}
          <div className="chart-box pie-charts">
            <h3>Phân Bố Rating</h3>
            <div className="pie-charts-container">
              <div className="pie-chart-wrapper">
                <h4>Phim</h4>
                <div style={{ height: '200px', width: '100%' }}>
                  <Pie 
                    data={getRatingData(movieRatings)}
                    options={commonChartOptions}
                  />
                </div>
              </div>
              <div className="pie-chart-wrapper">
                <h4>Anime</h4>
                <div style={{ height: '200px', width: '100%' }}>
                  <Pie 
                    data={getRatingData(animeRatings)}
                    options={commonChartOptions}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="no-data">😢 Chưa có dữ liệu thống kê.</p>
      )}
    </div>
  );
};

export default Stats;
