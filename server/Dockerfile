
# Use a Node.js base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /

# Copy package.json and package-lock.json first
# This allows Docker to use the cache if dependencies don't change
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your application runs on
EXPOSE 8080

# Command to run your application
CMD ["npm", "start"]