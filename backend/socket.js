const { Server } = require('socket.io');

let io = null;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'http://localhost:5173'
    },
    maxHttpBufferSize: 20 * 1024 * 1024
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO is not initialized');
  }

  return io;
};

module.exports = {
  initializeSocket,
  getIO
};
