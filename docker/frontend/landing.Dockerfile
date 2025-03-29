FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Make sure favicon.ico is at the root
COPY --from=builder /app/public/favicon.ico /usr/share/nginx/html/favicon.ico
COPY --from=builder /app/public/apple-touch-icon.png /usr/share/nginx/html/apple-touch-icon.png

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]