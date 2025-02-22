import Weather from '../components/Weather';
import Quotes from '../components/Quotes';
import RandomPicker from '../components/RandomPicker';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const Home = () => {
  const location = useLocation();
  const fromLogin = location.state?.fromLogin;

  useEffect(() => {
    if (fromLogin) {
      console.log("🎉 Người dùng vừa đăng nhập thành công!");
    }
  }, [fromLogin]);
  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <h1>🏠 Trang Chủ</h1>
      <Weather />
      <Quotes />
      <RandomPicker />
    </div>
  );
};

export default Home;
