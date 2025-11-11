# Stage 1: Build the application
FROM node:14 AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if it exists)
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy the rest of the application code
COPY . .

# Stage 2: Create the production image
FROM node:14 AS production

# Set the working directory
WORKDIR /app

# Copy dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist # Adjust if using a specific build folder

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000 # Change if necessary

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"] # Change if your entry point is different
