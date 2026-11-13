const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const connectDB = require('./config/database');
const jobRoutes = require('./routes/jobRoutes');
const workerRoutes = require('./routes/workerRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const { initializeSocket } = require('./socket');

const app = express();

connectDB();

app.use(cors({origin:process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'http://localhost:5173'}));
app.use(express.json({ limit: '20mb' }));

app.use('/auth', require('./routes/authRoutes'));
app.use('/models', require('./routes/modelRoutes'));
app.use('/job', jobRoutes);
app.use('/workers', workerRoutes);
app.use('/metrics', metricsRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Distributed Marching Cubes API'
  });
});

const server = http.createServer(app);

initializeSocket(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
