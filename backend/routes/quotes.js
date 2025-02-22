const express = require('express');
const axios = require('axios');

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

module.exports = router; // ✅ Sử dụng module.exports thay vì export default
