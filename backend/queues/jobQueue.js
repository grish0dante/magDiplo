const { Queue } = require('bullmq');
const redis = require('../config/redis');

const jobQueue = new Queue('marching-cubes', {
  connection: redis
});

module.exports = jobQueue;