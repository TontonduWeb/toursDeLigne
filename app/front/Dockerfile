# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances (dev + production)
RUN npm install

# Copier le code source
COPY . .

# Build de l'application React
RUN npm run build

# Production stage
FROM nginx:alpine

# Copier les fichiers buildés depuis l'étape précédente
COPY --from=build /app/build /usr/share/nginx/html

# Copier la configuration Nginx personnalisée (optionnel)
COPY nginx.conf /etc/nginx/nginx.conf

# Exposer le port 80
EXPOSE 3000

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]