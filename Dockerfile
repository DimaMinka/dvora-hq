# Use official Node.js 20 slim image
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Second stage: runtime
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application source
COPY --from=builder /app/src ./src

# Expose backend port
EXPOSE 8080

# Start server
CMD ["node", "src/index.js"]
