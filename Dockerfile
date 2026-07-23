# ============================================
# Dockerfile - WorkoutPlaner App
# ============================================

FROM node:20-alpine

# Arbeitsverzeichnis erstellen
WORKDIR /app

# package.json und package-lock.json kopieren
COPY package*.json ./

# Abhängigkeiten installieren
RUN npm install --production

# Quellcode kopieren
COPY . .

# Erforderliche Ordner für Persistenz erstellen
RUN mkdir -p data public/uploads src/data

# Port freigeben
EXPOSE 3000

# Umgebungsvariablen definieren
ENV NODE_ENV=production
ENV PORT=3000

# Container-Startbefehl
CMD ["node", "server.js"]
