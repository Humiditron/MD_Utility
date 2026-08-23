# Step 1: Build the app
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
# Note: Since you don't have a lock file yet, we use install
RUN npm install
COPY . .
RUN npm run build

# Step 2: Serve the app
FROM node:20-slim
WORKDIR /app
RUN npm install -g serve
# Copy only the compiled "binary" from the builder
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
