FROM node:24-alpine

WORKDIR /app
COPY ../package*.json ./
RUN npm install
COPY ../. .
RUN npx tsc
USER node
EXPOSE 3000
CMD ["node", "dist/app/index.js"]
