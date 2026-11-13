FROM node:22

WORKDIR /worker

COPY worker/package*.json ./

RUN npm install

COPY worker .

COPY shared /shared

CMD ["node", "worker.js"]


