FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Next.js needs explicit port argument
CMD ["sh", "-c", "npm start -- -p ${PORT:-3000}"]
