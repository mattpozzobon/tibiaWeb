FROM node:20-bookworm-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production

# IMPORTANT: bind inside container
ENV LOGIN_HOST=0.0.0.0
ENV GAME_HOST=0.0.0.0

EXPOSE 1338
EXPOSE 2222

CMD ["npm","run","start:all"]
