# Combined Dockerfile for both backend and frontend
FROM node:18-slim

# Install pdftk (required for PDF field extraction)
RUN apt-get update && apt-get install -y \
    pdftk \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy backend files
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ ./

# Copy frontend files to be served statically
COPY frontend/ ./frontend/

# Create temp directory for uploads
RUN mkdir -p /tmp/pdf-uploads

# Expose port (Render will set PORT env variable)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 10000) + '/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start the application
CMD ["node", "server.js"]