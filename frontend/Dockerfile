FROM docker.io/library/node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Metro bundler
EXPOSE 8081

CMD ["npx", "expo", "start", "--lan"]
