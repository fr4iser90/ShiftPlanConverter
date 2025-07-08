# Docker Deployment

## Overview

ShiftPlanConverter can be deployed using Docker for easy containerization and management. This guide covers Docker setup, configuration, and deployment options.

## Prerequisites

### Required Software
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: Version 2.0 or higher

### System Requirements
- **Operating System**: Linux, macOS, or Windows
- **Memory**: Minimum 512MB RAM
- **Storage**: Minimum 1GB free space
- **Network**: Internet access for pulling images

## Quick Start

### Step 1: Clone and Navigate
```bash
# Clone the repository
git clone https://github.com/your-username/ShiftPlanConverter.git

# Navigate to project directory
cd ShiftPlanConverter
```

### Step 2: Start the Application
```bash
# Start the application
docker-compose up -d

# Check status
docker-compose ps
```

### Step 3: Access the Application
Open your web browser and navigate to:
```
http://localhost:8080
```

## Docker Configuration

### Docker Compose File

The application uses a simple Docker Compose configuration:

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    image: nginx:alpine
    container_name: shiftplan
    volumes:
      - ./:/usr/share/nginx/html
    dns:
      - 1.1.1.1
    restart: unless-stopped
    ports:
      - 8080:80
```

### Configuration Breakdown

#### Service Definition
```yaml
web:                    # Service name
  image: nginx:alpine   # Base image (lightweight Nginx)
  container_name: shiftplan  # Container name
```

#### Volume Mounting
```yaml
volumes:
  - ./:/usr/share/nginx/html  # Mount current directory to Nginx web root
```

#### Network Configuration
```yaml
dns:
  - 1.1.1.1  # Use Cloudflare DNS for better performance
ports:
  - 8080:80  # Map host port 8080 to container port 80
```

#### Container Management
```yaml
restart: unless-stopped  # Restart container unless manually stopped
```

## Custom Dockerfile (Optional)

For more control over the deployment, you can create a custom Dockerfile:

```dockerfile
# Dockerfile
FROM nginx:alpine

# Install additional packages if needed
RUN apk add --no-cache curl

# Copy application files
COPY . /usr/share/nginx/html/

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Using Custom Dockerfile
```yaml
# docker-compose.yml with custom Dockerfile
version: '3.8'

services:
  web:
    build: .  # Build from Dockerfile
    container_name: shiftplan
    restart: unless-stopped
    ports:
      - 8080:80
```

## Nginx Configuration

### Default Configuration
The application includes a custom Nginx configuration for optimal performance:

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Security for sensitive files
        location ~ /\. {
            deny all;
        }
    }
}
```

### Custom Configuration
You can customize the Nginx configuration by modifying `nginx.conf`:

```bash
# Edit configuration
nano nginx.conf

# Restart container to apply changes
docker-compose restart
```

## Deployment Options

### 1. Local Development

#### Development Mode
```bash
# Start with volume mounting for live development
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

#### Development with Hot Reload
```bash
# Use custom development configuration
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Production Deployment

#### Production Configuration
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  web:
    image: nginx:alpine
    container_name: shiftplan-prod
    volumes:
      - ./:/usr/share/nginx/html:ro  # Read-only in production
    restart: always
    ports:
      - "80:80"
      - "443:443"  # HTTPS
    environment:
      - NODE_ENV=production
```

#### Production Deployment
```bash
# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 3. Multi-Environment Deployment

#### Environment-Specific Configurations
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Container Management

### Basic Commands

#### Start and Stop
```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# Restart containers
docker-compose restart
```

#### Status and Logs
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs web
```

#### Container Operations
```bash
# Execute commands in container
docker-compose exec web sh

# Copy files from container
docker cp shiftplan:/usr/share/nginx/html/config.json ./local-config.json

# Inspect container
docker inspect shiftplan
```

### Advanced Management

#### Resource Limits
```yaml
# docker-compose.yml with resource limits
version: '3.8'

services:
  web:
    image: nginx:alpine
    container_name: shiftplan
    volumes:
      - ./:/usr/share/nginx/html
    restart: unless-stopped
    ports:
      - 8080:80
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

#### Health Checks
```yaml
# docker-compose.yml with health check
version: '3.8'

services:
  web:
    image: nginx:alpine
    container_name: shiftplan
    volumes:
      - ./:/usr/share/nginx/html
    restart: unless-stopped
    ports:
      - 8080:80
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Monitoring and Logging

### Log Management

#### View Logs
```bash
# View all logs
docker-compose logs

# View logs with timestamps
docker-compose logs -t

# View recent logs
docker-compose logs --tail=100

# View logs for specific time period
docker-compose logs --since="2024-01-01T00:00:00"
```

#### Log Configuration
```yaml
# docker-compose.yml with logging configuration
version: '3.8'

services:
  web:
    image: nginx:alpine
    container_name: shiftplan
    volumes:
      - ./:/usr/share/nginx/html
    restart: unless-stopped
    ports:
      - 8080:80
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Performance Monitoring

#### Resource Usage
```bash
# Monitor resource usage
docker stats

# Monitor specific container
docker stats shiftplan

# View container details
docker inspect shiftplan
```

#### Network Monitoring
```bash
# Check network connectivity
docker-compose exec web ping google.com

# Check port binding
docker port shiftplan

# View network configuration
docker network ls
```

## Security Considerations

### Container Security

#### Non-Root User
```dockerfile
# Dockerfile with non-root user
FROM nginx:alpine

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy application files
COPY . /usr/share/nginx/html/

# Set ownership
RUN chown -R appuser:appgroup /usr/share/nginx/html

# Switch to non-root user
USER appuser

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Security Headers
```nginx
# nginx.conf with security headers
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Network Security

#### Port Configuration
```yaml
# docker-compose.yml with secure port configuration
version: '3.8'

services:
  web:
    image: nginx:alpine
    container_name: shiftplan
    volumes:
      - ./:/usr/share/nginx/html
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"  # Bind to localhost only
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
**Problem**: Port 8080 is already occupied
**Solution**:
```bash
# Check what's using the port
lsof -i :8080

# Change port in docker-compose.yml
ports:
  - 8081:80  # Use port 8081 instead

# Restart containers
docker-compose down && docker-compose up -d
```

#### 2. Permission Denied
**Problem**: Container can't access mounted files
**Solution**:
```bash
# Fix file permissions
chmod -R 755 .

# Or use different user in Dockerfile
USER nginx
```

#### 3. Container Won't Start
**Problem**: Container fails to start
**Solution**:
```bash
# Check container logs
docker-compose logs web

# Check container status
docker-compose ps

# Remove and recreate container
docker-compose down
docker-compose up -d
```

#### 4. Nginx Configuration Error
**Problem**: Nginx configuration is invalid
**Solution**:
```bash
# Test Nginx configuration
docker-compose exec web nginx -t

# Edit configuration
nano nginx.conf

# Restart container
docker-compose restart
```

### Debug Commands

#### Container Debugging
```bash
# Access container shell
docker-compose exec web sh

# Check Nginx status
docker-compose exec web nginx -t

# Check file permissions
docker-compose exec web ls -la /usr/share/nginx/html

# Check network connectivity
docker-compose exec web curl -I http://localhost
```

#### System Debugging
```bash
# Check Docker daemon
docker info

# Check available images
docker images

# Check running containers
docker ps

# Check Docker networks
docker network ls
```

## Best Practices

### 1. Container Management
- **Use specific image tags**: Avoid `latest` tag in production
- **Implement health checks**: Monitor container health
- **Set resource limits**: Prevent resource exhaustion
- **Use restart policies**: Ensure container availability

### 2. Security
- **Run as non-root user**: Minimize security risks
- **Use read-only volumes**: Prevent file system modifications
- **Implement security headers**: Protect against common attacks
- **Regular updates**: Keep base images updated

### 3. Performance
- **Use Alpine images**: Smaller footprint
- **Implement caching**: Cache static assets
- **Optimize Nginx configuration**: Tune for performance
- **Monitor resource usage**: Track container performance

### 4. Maintenance
- **Regular backups**: Backup configuration and data
- **Log rotation**: Prevent log file growth
- **Version control**: Track configuration changes
- **Documentation**: Maintain deployment documentation

---

*For production deployment details, see [Production Setup](./production.md).*
