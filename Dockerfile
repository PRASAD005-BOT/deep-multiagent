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

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Fix entrypoint
RUN chmod +x entrypoint.sh && sed -i 's/\r$//' entrypoint.sh

# Create workspace
RUN mkdir -p workspace

# Render uses dynamic PORT
ENV PORT=10000
EXPOSE 10000

# Start ONLY ONE server
CMD ["./entrypoint.sh"]
