FROM node:18-slim

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --only=production

# Copier le code source
COPY serveur-rest.js ./

# Créer le dossier data avec les bonnes permissions
RUN mkdir -p /app/data && \
    chmod 777 /app/data

EXPOSE 8082

# Lancer en tant que root pour éviter les problèmes de permissions SQLite
CMD ["node", "serveur-rest.js"]
