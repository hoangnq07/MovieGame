import { useEffect, useState } from 'react';

const Quotes = () => {
  const [quote, setQuote] = useState('');
  const [author, setAuthor] = useState('');
  const [translatedQuote, setTranslatedQuote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🎯 Hàm dịch sang tiếng Việt bằng LibreTranslate
  const translateText = async (text) => {
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`);
      const data = await res.json();
      return data.responseData.translatedText;
    } catch (err) {
      console.error('Lỗi dịch:', err);
      return '⚠️ Không thể dịch câu này';
    }
  };

  // 🎯 Hàm fetch quote từ ZenQuotes và dịch
  const fetchQuote = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('https://cors-anywhere.herokuapp.com/https://zenquotes.io/api/random');
      if (!res.ok) throw new Error('Không lấy được trích dẫn');
      const data = await res.json();
      const quoteText = data[0].q;
      const quoteAuthor = data[0].a;

      setQuote(quoteText);
      setAuthor(quoteAuthor);

      // 🌐 Dịch câu trích dẫn sang tiếng Việt
      const translated = await translateText(quoteText);
      setTranslatedQuote(translated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Lấy quote ngay khi load component
  useEffect(() => {
    fetchQuote();
  }, []);

  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '40px' }}>
      <h2>📖 Trích Dẫn Mỗi Ngày</h2>

      {loading && <p>Đang tải...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <div>
          {/* 📘 Câu gốc */}
          <blockquote style={{ fontStyle: 'italic', margin: '20px 0', fontSize: '1.2rem' }}>
            “{quote}”
          </blockquote>

          {/* ✍️ Bản dịch nhỏ hơn */}
          <p style={{ fontSize: '0.6rem', color: '#555' }}>
            “{translatedQuote}”
          </p>

          <p>— {author}</p>
        </div>
      )}

      <button onClick={fetchQuote}>🔄 Lấy câu mới</button>
    </div>
  );
};

export default Quotes;
