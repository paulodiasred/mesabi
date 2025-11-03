FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma
RUN npx prisma generate

# Copy app
COPY . .

# Build
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy prisma schema
COPY prisma ./prisma
RUN npx prisma generate

# Copy build
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main"]
