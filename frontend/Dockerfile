# Build stage
FROM node:18-alpine as build

# Increase Node memory limit
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Build the application with detailed error output
RUN npm run build || (echo "Build failed. See error above." && exit 1)

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