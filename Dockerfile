# Multi-stage Dockerfile for NestJS and Prisma

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client and build application
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Copy only the necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Set environment variables
ENV NODE_ENV=production

# Expose the application port (default NestJS 3000)
EXPOSE 3000

# Start command: Apply migrations and run the app
# Use a shell script if you need multiple commands
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
