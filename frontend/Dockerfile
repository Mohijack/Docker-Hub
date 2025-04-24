# Build stage
FROM node:18-alpine as build

# Set environment variables
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV GENERATE_SOURCEMAP=false
ENV CI=false

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy application code
COPY . .

# Build the application with detailed error output
RUN echo "Starting build process..." && \
    npm run build || (echo "Build failed with exit code $?. See error above." && exit 1)

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]