import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/random-quote', async (req, res) => {
  try {
    const response = await axios.get('https://zenquotes.io/api/random');
    res.json(response.data);
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: 'Lấy quote thất bại!' });
  }
});

export default router; // ✅ Đổi sang export default
