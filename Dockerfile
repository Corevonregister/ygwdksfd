FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Используем npm install вместо npm ci
RUN npm install --production && npm cache clean --force

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
