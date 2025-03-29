FROM nginx

# Create a static directory for favicon and other static files
RUN mkdir -p /usr/share/nginx/static

# Copy favicon and other static files
COPY static/favicon.ico /usr/share/nginx/static/
COPY static/apple-touch-icon.png /usr/share/nginx/static/

# Copy configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d /etc/nginx/conf.d

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]