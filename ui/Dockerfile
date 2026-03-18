FROM node:20

WORKDIR /app

# Copy UI package files
COPY ui/package*.json ./

# Install dependencies (with dev)
RUN npm install

# Copy UI source
COPY ui/ .

# Build app
RUN npm run build

# Install serve
RUN npm install -g serve

# Render port
ENV PORT=10000
EXPOSE 10000

# Start app
CMD ["sh", "-c", "serve -s dist -l $PORT"]
