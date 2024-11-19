# Utiliser une version plus récente de Node.js
FROM node:18

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et package-lock.json dans le conteneur
COPY package*.json ./

# Installer les dépendances
RUN npm install webhdfs 
RUN npm install axios
RUN npm install csv-parser
RUN npm install multer
RUN npm install

# Copier tout le reste du projet dans le conteneur
COPY . .

# Exposer le port 5000 pour le service API
EXPOSE 5000

# Démarrer l'application avec nodemon en mode développement ou node en production
CMD ["npm", "start"]
