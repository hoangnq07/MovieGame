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
  // State hiện tại
  const [movieFavorites, setMovieFavorites] = useState([]);
  const [movieRatings, setMovieRatings] = useState({});
  const [animeFavorites, setAnimeFavorites] = useState([]);
  const [animeRatings, setAnimeRatings] = useState({});
  
  // Thêm state mới
  const [mangaFavorites, setMangaFavorites] = useState([]);
  const [mangaRatings, setMangaRatings] = useState({});
  const [gameFavorites, setGameFavorites] = useState([]);
  const [gameRatings, setGameRatings] = useState({});
  const [bookFavorites, setBookFavorites] = useState([]);
  const [bookRatings, setBookRatings] = useState({});

  // Helper function để tính rating trung bình
  const calculateAverageRating = (ratings) => {
    return Object.values(ratings).length > 0
      ? (Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length).toFixed(1)
      : 0;
  };

  useEffect(() => {
    // Load data hiện tại
    const savedMovieFavorites = localStorage.getItem("favoriteMovies");
    const savedMovieRatings = localStorage.getItem("movieRatings");
    const savedAnimeFavorites = localStorage.getItem("favoriteAnime");
    const savedAnimeRatings = localStorage.getItem("animeRatings");
    
    // Load data mới
    const savedMangaFavorites = localStorage.getItem("favoriteManga");
    const savedMangaRatings = localStorage.getItem("mangaRatings");
    const savedGameFavorites = localStorage.getItem("favoriteGames");
    const savedGameRatings = localStorage.getItem("gameRatings");
    const savedBookFavorites = localStorage.getItem("favoriteBooks");
    const savedBookRatings = localStorage.getItem("bookRatings");
    
    // Set state hiện tại
    setMovieFavorites(savedMovieFavorites ? JSON.parse(savedMovieFavorites) : []);
    setMovieRatings(savedMovieRatings ? JSON.parse(savedMovieRatings) : {});
    setAnimeFavorites(savedAnimeFavorites ? JSON.parse(savedAnimeFavorites) : []);
    setAnimeRatings(savedAnimeRatings ? JSON.parse(savedAnimeRatings) : {});
    
    // Set state mới
    setMangaFavorites(savedMangaFavorites ? JSON.parse(savedMangaFavorites) : []);
    setMangaRatings(savedMangaRatings ? JSON.parse(savedMangaRatings) : {});
    setGameFavorites(savedGameFavorites ? JSON.parse(savedGameFavorites) : []);
    setGameRatings(savedGameRatings ? JSON.parse(savedGameRatings) : {});
    setBookFavorites(savedBookFavorites ? JSON.parse(savedBookFavorites) : []);
    setBookRatings(savedBookRatings ? JSON.parse(savedBookRatings) : {});
  }, []);

  // Cập nhật stats tổng quan
  const stats = {
    // Stats hiện tại
    totalItems: movieFavorites.length + animeFavorites.length + mangaFavorites.length + 
                gameFavorites.length + bookFavorites.length,
    totalMovies: movieFavorites.length,
    totalAnime: animeFavorites.length,
    totalManga: mangaFavorites.length,
    totalGames: gameFavorites.length,
    totalBooks: bookFavorites.length,
    
    ratedMovies: Object.keys(movieRatings).length,
    ratedAnime: Object.keys(animeRatings).length,
    ratedManga: Object.keys(mangaRatings).length,
    ratedGames: Object.keys(gameRatings).length,
    ratedBooks: Object.keys(bookRatings).length,
    
    averageMovieRating: calculateAverageRating(movieRatings),
    averageAnimeRating: calculateAverageRating(animeRatings),
    averageMangaRating: calculateAverageRating(mangaRatings),
    averageGameRating: calculateAverageRating(gameRatings),
    averageBookRating: calculateAverageRating(bookRatings)
  };

  // Cập nhật thống kê theo năm
  const getYearStats = () => {
    const yearStats = {};
    
    const addToYearStats = (items, type, dateField) => {
      items.forEach(item => {
        let year;
        if (type === 'anime') {
          year = item.aired?.prop?.from?.year;
        } else if (type === 'manga') {
          year = item.published?.prop?.from?.year;
        } else if (type === 'book') {
          year = item.publishedDate ? new Date(item.publishedDate).getFullYear() : null;
        } else if (type === 'game') {
          year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
        } else {
          year = item[dateField] ? new Date(item[dateField]).getFullYear() : null;
        }

        if (year) {
          yearStats[year] = yearStats[year] || { 
            movies: 0, 
            anime: 0, 
            manga: 0, 
            games: 0, 
            books: 0 
          };
          yearStats[year][type + 's']++;
        }
      });
    };

    addToYearStats(movieFavorites, 'movie', 'release_date');
    addToYearStats(animeFavorites, 'anime');
    addToYearStats(mangaFavorites, 'manga');
    addToYearStats(gameFavorites, 'game');
    addToYearStats(bookFavorites, 'book');

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
      },
      {
        label: "Manga",
        data: Object.keys(getYearStats()).sort().map(year => getYearStats()[year].manga),
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        tension: 0.3
      },
      {
        label: "Game",
        data: Object.keys(getYearStats()).sort().map(year => getYearStats()[year].games),
        borderColor: "rgb(153, 102, 255)",
        backgroundColor: "rgba(153, 102, 255, 0.5)",
        tension: 0.3
      },
      {
        label: "Sách",
        data: Object.keys(getYearStats()).sort().map(year => getYearStats()[year].books),
        borderColor: "rgb(255, 159, 64)",
        backgroundColor: "rgba(255, 159, 64, 0.5)",
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
            <span>📖 Manga: {stats.totalManga}</span>
            <span>🎮 Game: {stats.totalGames}</span>
            <span>📚 Sách: {stats.totalBooks}</span>
          </div>
        </div>
        <div className="stat-card">
          <h3>Đã đánh giá</h3>
          <p>{stats.ratedMovies + stats.ratedAnime + stats.ratedManga + stats.ratedGames + stats.ratedBooks}</p>
          <div className="stat-details">
            <span>🎬 Phim: {stats.ratedMovies}</span>
            <span>📺 Anime: {stats.ratedAnime}</span>
            <span>📖 Manga: {stats.ratedManga}</span>
            <span>🎮 Game: {stats.ratedGames}</span>
            <span>📚 Sách: {stats.ratedBooks}</span>
          </div>
        </div>
        <div className="stat-card">
          <h3>Điểm trung bình</h3>
          <div className="stat-details">
            <span>🎬 Phim: ⭐ {stats.averageMovieRating}/5</span>
            <span>📺 Anime: ⭐ {stats.averageAnimeRating}/5</span>
            <span>📖 Manga: ⭐ {stats.averageMangaRating}/5</span>
            <span>🎮 Game: ⭐ {stats.averageGameRating}/5</span>
            <span>📚 Sách: ⭐ {stats.averageBookRating}/5</span>
          </div>
        </div>
      </div>

      {stats.totalItems > 0 && (
        <div className="charts-grid">
          <div className="chart-box line-chart">
            <h3>Phân Bố Theo Năm</h3>
            <div style={{ height: '300px', width: '100%' }}>
              <Line data={yearData} options={lineChartOptions} />
            </div>
          </div>

          <div className="chart-box pie-charts">
            <h3>Phân Bố Rating</h3>
            <div className="pie-charts-container">
              {/* Existing pie charts */}
              <div className="pie-chart-wrapper">
                <h4>Phim</h4>
                <div style={{ height: '200px', width: '100%' }}>
                  <Pie data={getRatingData(movieRatings)} options={commonChartOptions} />
                </div>
              </div>
              <div className="pie-chart-wrapper">
                <h4>Anime</h4>
                <div style={{ height: '200px', width: '100%' }}>
                  <Pie data={getRatingData(animeRatings)} options={commonChartOptions} />
                </div>
              </div>
              {/* New pie charts */}
              <div className="pie-chart-wrapper">
                <h4>Manga</h4>
                <div style={{ height: '200px', width: '100%' }}>
                  <Pie data={getRatingData(mangaRatings)} options={commonChartOptions} />
                </div>
              </div>
              <div className="pie-chart-wrapper">
                <h4>Game</h4>
                <div style={{ height: '200px', width: '100%' }}>
                  <Pie data={getRatingData(gameRatings)} options={commonChartOptions} />
                </div>
              </div>
              <div className="pie-chart-wrapper">
                <h4>Sách</h4>
                <div style={{ height: '200px', width: '100%' }}>
                  <Pie data={getRatingData(bookRatings)} options={commonChartOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;
