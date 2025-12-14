FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Force port 3000, ignoring any injected PORT variable
ENV PORT=3000

CMD ["npm", "start", "--", "-p", "3000"]
