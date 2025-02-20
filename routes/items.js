const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET tất cả items
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM movies_games ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST thêm mới item
router.post('/', async (req, res) => {
  const { title, type, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO movies_games (title, type, status) VALUES ($1, $2, $3) RETURNING *',
      [title, type, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT cập nhật item
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, type, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE movies_games SET title=$1, type=$2, status=$3 WHERE id=$4 RETURNING *',
      [title, type, status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM movies_games WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
