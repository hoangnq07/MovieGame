import { Link } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';

const Header = () => {
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#282c34' }}>
      <div style={{ display: 'flex', gap: '15px' }}>
        <Link to="/" style={{ color: 'white' }}>🏠 Home</Link>
        <Link to="/movies" style={{ color: 'white' }}>🎬 Movies</Link>
        <Link to="/manga" style={{ color: 'white' }}>📖 Manga</Link>
        <Link to="/books" style={{ color: 'white' }}>📚 Books</Link>
        <Link to="/games" style={{ color: 'white' }}>🎮 Games</Link>
        <Link to="/settings" style={{ color: 'white' }}>⚙️ Settings</Link>
      </div>
      <DarkModeToggle />
    </nav>
  );
};

export default Header;
