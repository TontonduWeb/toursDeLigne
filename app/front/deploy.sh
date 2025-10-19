#!/bin/bash
cd ~/docker-services/tours-de-ligne/app/front

echo "📦 Building React app..."
npm run build

echo "🐳 Building Docker image..."
docker build -t toursdeligne-frontend .

echo "🔄 Restarting container..."
docker stop tour-de-ligne-frontend
docker rm tour-de-ligne-frontend
docker run -d \
  --name tour-de-ligne-frontend \
  --network docker-services_internal \
  -p 3001:3000 \
  toursdeligne-frontend

echo "✅ Done! Check https://frontend.serveur-matthieu.ovh"
docker ps | grep tour-de-ligne-frontend
