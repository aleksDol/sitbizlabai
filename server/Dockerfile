FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 5051

CMD ["npm", "run", "start"]
