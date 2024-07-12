# Dockerfile for Node.js backend

# Use the official Node.js image as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Set the command to start the server
CMD ["node", "server.js"]

# Expose port 3000
EXPOSE 3000
