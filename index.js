const express = require('express');
const cors = require('cors');
const app = express();
const itemsRouter = require('./routes/items');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to Movie/Game API 🎬🎮');
});

app.use('/api/items', itemsRouter);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
