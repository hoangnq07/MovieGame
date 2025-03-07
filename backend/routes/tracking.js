import express from 'express';
import { db } from '../firebase';
import { withTracking } from './withTracking';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const interaction = req.body;
    
    // Lưu vào Firestore
    await db.collection('user_interactions').add({
      ...interaction,
      serverTimestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Cập nhật điểm ưu tiên cho item
    const itemRef = db.collection('items').doc(interaction.itemId);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(itemRef);
      if (!doc.exists) return;

      const currentPriority = doc.data().priority || 0;
      let priorityDelta = 0;

      switch (interaction.interactionType) {
        case 'view':
          priorityDelta = 1;
          break;
        case 'hover':
          priorityDelta = 0.5;
          break;
        case 'click':
          priorityDelta = 2;
          break;
        case 'time_spent':
          const minutesSpent = interaction.metadata.duration / 60000;
          priorityDelta = Math.min(minutesSpent * 0.5, 5);
          break;
      }

      transaction.update(itemRef, {
        priority: currentPriority + priorityDelta
      });
    });

    res.status(200).json({ message: 'Interaction tracked successfully' });
  } catch (error) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({ error: 'Failed to track interaction' });
  }
});

const MovieCard = ({ movie, onFavorite }) => {
  return (
    <div className="movie-card">
      <img src={movie.poster_path} alt={movie.title} />
      <h3>{movie.title}</h3>
      {/* ... other content ... */}
    </div>
  );
};

export default withTracking(MovieCard);
