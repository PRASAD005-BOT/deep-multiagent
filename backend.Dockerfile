# Backend Dockerfile for DevAgent
FROM python:3.11-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git \
    nodejs \
    npm \
    bash \
    pkgconfig \
    gcc \
    musl-dev \
    python3-dev \
    libffi-dev \
    openssl-dev

WORKDIR /app

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Ensure entrypoint is executable and has Linux line endings
RUN chmod +x entrypoint.sh && sed -i 's/\r$//' entrypoint.sh

# Create workspace directory
RUN mkdir -p workspace

# Expose ports for UI Server and MCP Server
EXPOSE 8888 8889

# Entrypoint starts both UI and MCP servers
CMD ["./entrypoint.sh"]
