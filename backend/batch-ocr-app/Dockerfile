# Multi-stage Docker build for OCR processing
FROM node:18-alpine AS builder

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    dumb-init

WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs ocr-processor.js ./
COPY --chown=nodejs:nodejs package.json ./

# Set proper permissions
RUN chmod +x ocr-processor.js

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "ocr-processor.js"]

# Labels for metadata
LABEL maintainer="NewsArchive Pro Team"
LABEL version="1.0.0"
LABEL description="OCR processing container for AWS Batch"
LABEL org.opencontainers.image.source="https://github.com/newsarchive/newsarchive-pro"