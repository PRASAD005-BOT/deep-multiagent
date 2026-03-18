FROM node:20

WORKDIR /app

# ✅ MUST MATCH your React code
ARG VITE_API_BASEURL
ENV VITE_API_BASEURL=$VITE_API_BASEURL

COPY ui/package*.json ./
RUN npm install

COPY ui/ .

# Build with env injected
RUN node node_modules/vite/bin/vite.js build

RUN npm install -g serve

ENV PORT=10000
EXPOSE 10000

CMD ["sh", "-c", "serve -s dist -l $PORT"]
