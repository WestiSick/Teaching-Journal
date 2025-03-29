FROM node:18-alpine as builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

FROM nginx:alpine

# Copy the build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Make sure favicon.ico is at the root
COPY --from=builder /app/public/favicon.ico /usr/share/nginx/html/favicon.ico
COPY --from=builder /app/public/apple-touch-icon.png /usr/share/nginx/html/apple-touch-icon.png

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]