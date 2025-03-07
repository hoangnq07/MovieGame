import { useState, useEffect } from 'react';
import { FaHeart, FaStar, FaSearch, FaChartBar } from 'react-icons/fa';
import { Bar, Pie } from 'react-chartjs-2';
import "../styles/books.css";

const Books = () => {
  const [booksList, setBooksList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favoriteBooks");
    return saved ? JSON.parse(saved) : [];
  });

  // Thêm state cho modal thống kê
  const [showStats, setShowStats] = useState(false);

  const fetchBooks = async (query, pageNum = 1) => {
    try {
      setIsLoading(true);
      const startIndex = (pageNum - 1) * 12;
      // Sử dụng API không cần key
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&startIndex=${startIndex}&maxResults=12&langRestrict=vi`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      return data.items?.map(book => ({
        id: book.id,
        title: book.volumeInfo.title,
        authors: book.volumeInfo.authors || ['Không có tác giả'],
        coverUrl: book.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '/placeholder-book.png',
        description: book.volumeInfo.description || 'Chưa có mô tả',
        publisher: book.volumeInfo.publisher || 'Không có NXB',
        rating: book.volumeInfo.averageRating || 0,
        reviewCount: book.volumeInfo.ratingsCount || 0,
        categories: book.volumeInfo.categories || [],
        publishedDate: book.volumeInfo.publishedDate,
        pageCount: book.volumeInfo.pageCount || 'N/A',
      })) || [];

    } catch (error) {
      console.error('Lỗi khi tải sách:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    const newBooks = await fetchBooks(searchQuery || 'sách việt nam');
    setBooksList(newBooks);
    setHasMore(newBooks.length === 12);
  };

  const loadMoreBooks = async () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      const moreBooks = await fetchBooks(searchQuery || 'sách việt nam', nextPage);
      if (moreBooks.length > 0) {
        setBooksList(prev => [...prev, ...moreBooks]);
        setPage(nextPage);
        setHasMore(moreBooks.length === 12);
      } else {
        setHasMore(false);
      }
    }
  };

  const handleToggleFavorite = (book) => {
    setFavorites(prev => {
      const existingFavorite = prev.find(f => f.id === book.id);
      
      if (existingFavorite) {
        const newFavorites = prev.filter(f => f.id !== book.id);
        localStorage.setItem("favoriteBooks", JSON.stringify(newFavorites));
        return newFavorites;
      } else {
        const bookToAdd = {
          ...book,
          dateAdded: new Date().toISOString(),
        };
        const newFavorites = [...prev, bookToAdd];
        localStorage.setItem("favoriteBooks", JSON.stringify(newFavorites));
        return newFavorites;
      }
    });
  };

  // Hàm tính thống kê
  const calculateStats = () => {
    if (!favorites.length) return null;

    const stats = {
      total: favorites.length,
      byYear: {},
      byPublisher: {},
      byRating: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
      averageRating: 0,
      totalPages: 0,
      averagePages: 0
    };

    favorites.forEach(book => {
      // Thống kê theo năm
      const year = book.publishedDate ? new Date(book.publishedDate).getFullYear() : 'Không rõ';
      stats.byYear[year] = (stats.byYear[year] || 0) + 1;

      // Thống kê theo nhà xuất bản
      const publisher = book.publisher || 'Không rõ';
      stats.byPublisher[publisher] = (stats.byPublisher[publisher] || 0) + 1;

      // Thống kê theo rating
      if (book.rating > 0) {
        const rating = Math.round(book.rating);
        stats.byRating[rating] = (stats.byRating[rating] || 0) + 1;
      }

      // Tính tổng số trang
      if (book.pageCount && book.pageCount !== 'N/A') {
        stats.totalPages += parseInt(book.pageCount);
      }
    });

    // Tính rating trung bình
    const validRatings = favorites.filter(book => book.rating > 0);
    stats.averageRating = validRatings.length > 0
      ? (validRatings.reduce((sum, book) => sum + book.rating, 0) / validRatings.length).toFixed(1)
      : 0;

    // Tính số trang trung bình
    const booksWithPages = favorites.filter(book => book.pageCount && book.pageCount !== 'N/A');
    stats.averagePages = booksWithPages.length > 0
      ? Math.round(stats.totalPages / booksWithPages.length)
      : 0;

    return stats;
  };

  // Data cho biểu đồ
  const getChartData = () => {
    const stats = calculateStats();
    if (!stats) return null;

    return {
      yearData: {
        labels: Object.keys(stats.byYear).sort(),
        datasets: [{
          label: 'Số sách theo năm',
          data: Object.keys(stats.byYear).sort().map(year => stats.byYear[year]),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      ratingData: {
        labels: ['1 sao', '2 sao', '3 sao', '4 sao', '5 sao'],
        datasets: [{
          data: Object.values(stats.byRating),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF'
          ]
        }]
      }
    };
  };

  // Component thống kê
  const StatsModal = () => {
    const stats = calculateStats();
    const chartData = getChartData();

    if (!stats) return <div>Chưa có dữ liệu thống kê</div>;

    return (
      <div className="stats-modal">
        <button className="close-button" onClick={() => setShowStats(false)}>×</button>
        
        <div className="stats-summary">
          <div className="stat-card">
            <h3>Tổng số sách</h3>
            <p>{stats.total}</p>
          </div>
          <div className="stat-card">
            <h3>Đánh giá trung bình</h3>
            <p>⭐ {stats.averageRating}/5</p>
          </div>
          <div className="stat-card">
            <h3>Số trang trung bình</h3>
            <p>📚 {stats.averagePages}</p>
          </div>
        </div>

        <div className="charts-container">
          <div className="chart-box">
            <h3>Phân bố theo năm</h3>
            <Bar
              data={chartData.yearData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
            />
          </div>

          <div className="chart-box">
            <h3>Phân bố đánh giá</h3>
            <Pie
              data={chartData.ratingData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Initial load
  useEffect(() => {
    fetchBooks('sách việt nam').then(books => setBooksList(books));
  }, []);

  return (
    <div className="books-container">
      <div className="header-actions">
        <h1 className="text-3xl font-bold">📚 Sách</h1>
        <button 
          className="stats-button"
          onClick={() => setShowStats(true)}
          disabled={favorites.length === 0}
        >
          <FaChartBar /> Thống kê
        </button>
      </div>

      <div className="books-filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sách..."
            className="search-input"
          />
          <button type="submit" className="search-button" disabled={isLoading}>
            <FaSearch /> Tìm
          </button>
        </form>
      </div>

      {isLoading && <div className="loading">Đang tải...</div>}

      <div className="books-grid">
        {booksList.map(book => (
          <div key={book.id} className="book-card">
            <div className="book-cover">
              <img 
                src={book.coverUrl} 
                alt={book.title}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-book.png';
                }}
              />
              <button
                className={`favorite-button ${favorites.some(f => f.id === book.id) ? 'active' : ''}`}
                onClick={() => handleToggleFavorite(book)}
              >
                <FaHeart />
              </button>
            </div>
            <div className="book-info">
              <h3 className="book-title">{book.title}</h3>
              <p className="book-author">{book.authors.join(', ')}</p>
              <div className="book-rating">
                <FaStar /> {book.rating > 0 ? book.rating.toFixed(1) : 'N/A'}
                {book.reviewCount > 0 && (
                  <span className="text-sm text-gray-500">
                    ({book.reviewCount} đánh giá)
                  </span>
                )}
              </div>
              {book.publisher && (
                <p className="book-publisher text-sm text-gray-600">
                  {book.publisher} • {book.pageCount} trang
                </p>
              )}
              {book.categories?.length > 0 && (
                <p className="book-categories text-sm text-gray-500">
                  {book.categories[0]}
                </p>
              )}
              {book.publishedDate && (
                <p className="book-published text-sm text-gray-500">
                  Xuất bản: {new Date(book.publishedDate).getFullYear()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadMoreBooks}
          disabled={isLoading}
          className="load-more-button"
        >
          {isLoading ? 'Đang tải...' : 'Xem thêm'}
        </button>
      )}

      {showStats && <StatsModal />}
    </div>
  );
};

export default Books;
