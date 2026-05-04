FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=http://localhost:5051
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_LEADS_API_URL=http://localhost:3000
ENV VITE_LEADS_API_URL=$VITE_LEADS_API_URL

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vite.config.js ./vite.config.js

EXPOSE 5173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
