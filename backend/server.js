
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const express = require('express');
const path = require('path');
const { fileURLToPath } = require('url');
const cors = require('cors');
const quotesRoute = require('./routes/quotes.js'); // Đảm bảo có .js khi dùng ESM

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use('/api', quotesRoute);
app.use('/api/auth', authRoutes);
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
