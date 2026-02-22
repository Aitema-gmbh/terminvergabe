FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

FROM base AS development
CMD ["npm", "run", "dev"]

FROM base AS build
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "build"]
