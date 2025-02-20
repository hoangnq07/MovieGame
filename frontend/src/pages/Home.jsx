import Weather from '../components/Weather';
import Quotes from '../components/Quotes';
import RandomPicker from '../components/RandomPicker';

const Home = () => {
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
