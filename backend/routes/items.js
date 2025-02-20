const express = require('express');
const router = express.Router();
const db = require('../firebase');

// Collection trong Firestore
const collectionRef = db.collection('movies_games');

// GET tất cả items
router.get('/', async (req, res) => {
  try {
    const snapshot = await collectionRef.get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST thêm mới item
router.post('/', async (req, res) => {
  const { title, type, status } = req.body;
  try {
    const newItem = await collectionRef.add({ title, type, status });
    res.status(201).json({ id: newItem.id, title, type, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT cập nhật item
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, type, status } = req.body;
  try {
    await collectionRef.doc(id).update({ title, type, status });
    res.json({ id, title, type, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await collectionRef.doc(id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
