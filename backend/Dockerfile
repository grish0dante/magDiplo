FROM node:22

WORKDIR /app

COPY backend/package*.json ./

RUN npm install

COPY backend .

COPY shared /shared

EXPOSE 3000

CMD ["node", "server.js"]