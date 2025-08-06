# Use Node.js 18 slim image
FROM node:18-slim

# Install pdftk (required for PDF field extraction)
RUN apt-get update && apt-get install -y \
    pdftk \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create temp directory for uploads
RUN mkdir -p /tmp/pdf-uploads

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start the application
CMD ["node", "server.js"]