import { useState } from 'react';

const RandomPicker = () => {
  const [items, setItems] = useState(['Interstellar', 'The Witcher 3', 'Breaking Bad', 'Elden Ring', 'Inception']);
  const [newItem, setNewItem] = useState('');
  const [selectedItem, setSelectedItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, newItem]);
      setNewItem('');
    }
  };

  const handleRandomPick = () => {
    if (items.length > 0) {
      const randomIndex = Math.floor(Math.random() * items.length);
      setSelectedItem(items[randomIndex]);
    }
  };

  const handleReset = () => {
    setItems([]);
    setSelectedItem('');
  };

  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '30px' }}>
      <h2>🎡 Vòng Quay May Mắn</h2>

      <input
        type="text"
        value={newItem}
        onChange={(e) => setNewItem(e.target.value)}
        placeholder="Thêm phim/game..."
        style={{ width: '70%', padding: '8px', marginTop: '10px' }}
      />
      <button onClick={handleAddItem}>➕ Thêm</button>

      <div style={{ marginTop: '20px' }}>
        <button onClick={handleRandomPick} style={{ marginRight: '10px' }}>🎲 Quay</button>
        <button onClick={handleReset}>♻️ Reset</button>
      </div>

      {selectedItem && (
        <div style={{ marginTop: '20px', fontSize: '1.5rem', fontWeight: 'bold' }}>
          🎉 Bạn nên xem/chơi: <span>{selectedItem}</span>
        </div>
      )}

      <h4 style={{ marginTop: '20px' }}>📋 Danh sách hiện tại:</h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item, index) => (
          <li key={index}>🎬 {item}</li>
        ))}
      </ul>
    </div>
  );
};

export default RandomPicker;
