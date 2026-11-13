const express = require('express');

const {
  createJob,
  getJob,
  updateProgress,
  getModelGeometry,
  startJob, cancelJob, failJob
} = require('../controllers/jobController');

const router = express.Router();
const workerKey=require('../middleware/workerKey');

router.post('/create', createJob);
router.post('/:id/start', startJob);
router.post('/progress', workerKey, updateProgress);
router.post('/fail', workerKey, failJob);
router.post('/:id/cancel',cancelJob);
router.get('/:id/model', getModelGeometry);
router.get('/:id', getJob);
module.exports = router;
