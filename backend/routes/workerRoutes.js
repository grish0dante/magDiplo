const express = require('express');

const {
  heartbeat,
  getWorkers
} = require('../controllers/workerController');

const router = express.Router();

router.post('/heartbeat', heartbeat);
router.get('/', getWorkers);

module.exports = router;
