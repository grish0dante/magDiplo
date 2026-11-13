const axios = require('axios');
const os = require('os');

const startHeartbeat = () => {
  setInterval(async () => {
    try {
      await axios.post(
        `${process.env.BACKEND_URL}/workers/heartbeat`,
        {
          workerId: os.hostname(),
          cpuLoad: os.loadavg()[0],
          memoryUsage: process.memoryUsage().heapUsed
        }
      );
    } catch (error) {
      console.error('Heartbeat error:', error.message);
    }
  }, 5000);
};

module.exports = {
  startHeartbeat
};
