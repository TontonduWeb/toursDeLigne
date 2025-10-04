# Utiliser l'image Node.js officielle
FROM node:18-slim

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer sans rebuild (laissez npm utiliser les binaires précompilés)
RUN npm install --only=production

# Copier le code source
COPY . .

# Créer l'utilisateur AVANT le dossier data
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

# Créer le dossier data et donner les permissions
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app

USER nodejs

# Exposer le port
EXPOSE 8082

# Commande pour démarrer l'application
CMD ["node", "serveur-rest.js"]
