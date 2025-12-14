FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Accept the build argument
ARG NEXT_PUBLIC_API_URL
# Set it as an environment variable for the build process
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Force port 3000
ENV PORT=3000

CMD ["npm", "start", "--", "-p", "3000"]