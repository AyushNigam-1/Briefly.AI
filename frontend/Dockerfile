# frontend/Dockerfile
FROM node:20

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of your Next.js code
COPY . .

ENV MONGODB_URI="mongodb+srv://AyushNigam:Ayush@cluster0.ot1vqur.mongodb.net/briefly?appName=Cluster0"
ENV BETTER_AUTH_URL="http://localhost:3000"
ENV BETTER_AUTH_SECRET="dummy_secret_for_build_step"

RUN npm run build

# Expose the port Better Auth and Next.js use
EXPOSE 3000

# Start the Next.js production server
CMD ["npm", "start"]