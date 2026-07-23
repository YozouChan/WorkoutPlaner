# 🐳 Docker Anleitung - WorkoutPlaner App

Diese Anwendung kann ganz einfach als Docker-Container ausgeführt werden.

---

## 🚀 Schnellstart mit Docker Compose (Empfohlen)

### 1. Container starten:
```bash
docker compose up -d --build
```

Die App ist nun erreichbar unter: **`http://localhost:3000`**

### 2. Status prüfen:
```bash
docker compose ps
```

### 3. Logs einsehen:
```bash
docker compose logs -f
```

### 4. Container stoppen:
```bash
docker compose down
```

---

## 🛠️ Ausführen mit Docker CLI (ohne Compose)

### 1. Image bauen:
```bash
docker build -t workout-planer .
```

### 2. Container starten (mit Daten-Persistenz):
```bash
docker run -d \
  --name workout-planer \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/public/uploads:/app/public/uploads \
  --restart unless-stopped \
  workout-planer
```

### Windows PowerShell:
```powershell
docker run -d `
  --name workout-planer `
  -p 3000:3000 `
  -v ${PWD}/data:/app/data `
  -v ${PWD}/public/uploads:/app/public/uploads `
  --restart unless-stopped `
  workout-planer
```

---

## 💾 Daten-Persistenz (Volumes)

Folgende Ordner sind als Volume gemountet, damit Daten beim Neustart oder Update erhalten bleiben:
- `./data` → Beinhaltet alle Benutzer-Daten, Workouts und App-Zustände.
- `./public/uploads` → Beinhaltet alle hochgeladenen Bilder und GIFs.
