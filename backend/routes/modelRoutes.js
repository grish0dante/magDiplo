const express = require('express');
const mongoose = require('mongoose');
const SavedModel = require('../models/SavedModel');
const { read, requireAuth } = require('../middleware/auth');

const router = express.Router();

const isId = (id) => mongoose.isValidObjectId(id);
const fields =
  'title description visibility formula isoValue resolution chunkSize volumeSize color triangleCount createdAt updatedAt owner';

const clean = (body) => ({
  title: String(body.title || '').trim(),
  description: String(body.description || '').trim(),
  visibility: body.visibility || 'private',
  formula: String(body.formula || '').trim(),
  isoValue: Number(body.isoValue ?? 0),
  resolution: Number(body.resolution ?? 32),
  chunkSize: Number(body.chunkSize ?? 4),
  volumeSize: Number(body.volumeSize ?? 32),
  color: String(body.color || '#29c7c7'),
  vertices: body.vertices,
});

function valid(model) {
  return (
    model.title.length >= 1 &&
    model.title.length <= 100 &&
    model.description.length <= 1200 &&
    ['private', 'unlisted', 'public'].includes(model.visibility) &&
    model.formula.length > 0 &&
    model.formula.length <= 240 &&
    Number.isFinite(model.isoValue) &&
    Number.isInteger(model.resolution) &&
    model.resolution >= 16 &&
    model.resolution <= 512 &&
    Number.isInteger(model.chunkSize) &&
    model.chunkSize >= 2 &&
    model.chunkSize <= 64 &&
    Number.isFinite(model.volumeSize) &&
    model.volumeSize > 0 &&
    model.volumeSize <= 1000 &&
    /^#[0-9a-f]{6}$/i.test(model.color) &&
    Array.isArray(model.vertices) &&
    model.vertices.length <= 150000 &&
    model.vertices.length % 9 === 0 &&
    model.vertices.every((value) => typeof value === 'number' && Number.isFinite(value))
  );
}

router.get('/gallery', async (req, res) => {
  try {
    const page = Math.max(1, Math.min(1000, Number.parseInt(req.query.page) || 1));
    const models = await SavedModel.find({ visibility: 'public' })
      .select(fields)
      .populate('owner', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * 12)
      .limit(12)
      .lean();

    res.json({ models, page });
  } catch {
    res.status(500).json({ error: 'Не вдалося завантажити галерею' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const models = await SavedModel.find({ owner: req.userId })
      .select(fields)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ models });
  } catch {
    res.status(500).json({ error: 'Помилка завантаження' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const model = clean(req.body);

    if (!valid(model)) {
      return res.status(400).json({
        error: 'Некоректні параметри або модель завелика (макс. 150 000 координат)',
      });
    }

    const doc = await SavedModel.create({
      ...model,
      owner: req.userId,
      triangleCount: model.vertices.length / 9,
    });

    res.status(201).json({ model: doc });
  } catch {
    res.status(500).json({ error: 'Не вдалося зберегти модель' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.sendStatus(404);

    const model = await SavedModel.findById(req.params.id).populate('owner', 'name');
    if (!model) return res.sendStatus(404);

    if (model.visibility === 'private' && String(model.owner._id) !== read(req)) {
      return res.sendStatus(404);
    }

    res.json({ model });
  } catch {
    res.status(500).json({ error: 'Помилка завантаження моделі' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.sendStatus(404);

    const changes = {};

    if ('title' in req.body) {
      changes.title = String(req.body.title).trim();
      if (!changes.title || changes.title.length > 100) return res.sendStatus(400);
    }

    if ('description' in req.body) {
      changes.description = String(req.body.description).trim();
      if (changes.description.length > 1200) return res.sendStatus(400);
    }

    if ('visibility' in req.body) {
      if (!['private', 'unlisted', 'public'].includes(req.body.visibility)) {
        return res.sendStatus(400);
      }
      changes.visibility = req.body.visibility;
    }

    const model = await SavedModel.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { $set: changes },
      { new: true, runValidators: true },
    ).select(fields);

    if (!model) return res.sendStatus(404);
    res.json({ model });
  } catch {
    res.status(500).json({ error: 'Помилка оновлення' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.sendStatus(404);

    const result = await SavedModel.deleteOne({ _id: req.params.id, owner: req.userId });
    if (!result.deletedCount) return res.sendStatus(404);

    res.sendStatus(204);
  } catch {
    res.status(500).json({ error: 'Помилка видалення' });
  }
});

module.exports = router;

