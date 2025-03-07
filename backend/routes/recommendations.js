import express from 'express';
import { db } from '../firebase';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { userId, interactions } = req.body;

    // Lấy preferences của user từ interactions
    const userPreferences = analyzeUserPreferences(interactions);

    // Fetch items từ các collections
    const [movies, games, books, anime] = await Promise.all([
      fetchRecommendedItems('movies', userPreferences),
      fetchRecommendedItems('games', userPreferences),
      fetchRecommendedItems('books', userPreferences),
      fetchRecommendedItems('anime', userPreferences)
    ]);

    res.json({
      movies,
      games,
      books,
      anime
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Phân tích preferences từ interactions
function analyzeUserPreferences(interactions) {
  const preferences = {
    genres: {},
    creators: {},
    keywords: {},
    recentInteractions: []
  };

  // Lấy 100 interactions gần nhất
  const recentInteractions = interactions
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);

  recentInteractions.forEach(interaction => {
    // Thêm vào recent
    preferences.recentInteractions.push({
      itemId: interaction.itemId,
      type: interaction.itemType,
      score: calculateInteractionScore(interaction)
    });

    // Update genre preferences
    if (interaction.metadata?.genres) {
      interaction.metadata.genres.forEach(genre => {
        preferences.genres[genre] = (preferences.genres[genre] || 0) + 
          calculateInteractionScore(interaction);
      });
    }

    // Update creator preferences
    if (interaction.metadata?.creators) {
      interaction.metadata.creators.forEach(creator => {
        preferences.creators[creator] = (preferences.creators[creator] || 0) + 
          calculateInteractionScore(interaction);
      });
    }

    // Update keyword preferences
    if (interaction.metadata?.keywords) {
      interaction.metadata.keywords.forEach(keyword => {
        preferences.keywords[keyword] = (preferences.keywords[keyword] || 0) + 
          calculateInteractionScore(interaction);
      });
    }
  });

  return preferences;
}

// Tính điểm cho mỗi interaction
function calculateInteractionScore(interaction) {
  const age = (Date.now() - interaction.timestamp) / (1000 * 60 * 60 * 24); // days
  const timeDecay = Math.exp(-age / 30); // exponential decay over 30 days

  let baseScore = 0;
  switch (interaction.interactionType) {
    case 'view':
      baseScore = 1;
      break;
    case 'hover':
      baseScore = 0.5;
      break;
    case 'click':
      baseScore = 2;
      break;
    case 'time_spent':
      const minutesSpent = interaction.metadata.duration / 60000;
      baseScore = Math.min(minutesSpent * 0.5, 5);
      break;
  }

  return baseScore * timeDecay;
}

// Fetch và sort items theo relevance
async function fetchRecommendedItems(collection, userPreferences) {
  const snapshot = await db.collection(collection)
    .orderBy('priority', 'desc')
    .limit(20)
    .get();

  const items = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Calculate match score for each item
  return items.map(item => ({
    ...item,
    matchScore: calculateMatchScore(item, userPreferences)
  }))
  .sort((a, b) => b.matchScore - a.matchScore)
  .slice(0, 8);
}

// Tính điểm match cho mỗi item
function calculateMatchScore(item, preferences) {
  let score = 0;
  let weights = 0;

  // Genre matching
  if (item.genres) {
    const genreScore = item.genres.reduce((sum, genre) => 
      sum + (preferences.genres[genre] || 0), 0);
    score += genreScore * 0.4;
    weights += 0.4;
  }

  // Creator matching
  if (item.creators) {
    const creatorScore = item.creators.reduce((sum, creator) => 
      sum + (preferences.creators[creator] || 0), 0);
    score += creatorScore * 0.3;
    weights += 0.3;
  }

  // Keyword matching
  if (item.keywords) {
    const keywordScore = item.keywords.reduce((sum, keyword) => 
      sum + (preferences.keywords[keyword] || 0), 0);
    score += keywordScore * 0.3;
    weights += 0.3;
  }

  return weights > 0 ? score / weights : 0;
}

export default router;