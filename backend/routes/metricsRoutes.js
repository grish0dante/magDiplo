const express = require('express');

const {
  getQueueMetrics
} = require('../services/queueMetricsService');

const router = express.Router();

router.get('/', async (req, res) => {
  const metrics = await getQueueMetrics();
  res.json(metrics);
});

module.exports = router;
