import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import quotesRoute from './routes/quotes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Lấy __dirname trong ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Bật CORS
app.use(cors());
app.use(express.json());

// ✅ Route API
app.use("/api/quotes", quotesRoute);

// ✅ Serve Frontend build nếu cần
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ✅ SPA Route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
