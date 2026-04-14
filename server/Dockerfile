FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV NODE_OPTIONS=--use-openssl-ca

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 5051

CMD ["npm", "run", "start"]
