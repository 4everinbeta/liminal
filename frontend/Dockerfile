FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Next.js starts on port 3000 by default, or respects the PORT env var
CMD ["npm", "start"]