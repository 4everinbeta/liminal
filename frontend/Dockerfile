FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

ENV PORT=3000

# Next.js starts on port 3000 by default
CMD ["npm", "start"]