# Starting up Group1FS v2.0

## 1. Local Development
### Backend (Port 5000)
```cmd
cd backend
npm run dev
```
*(Production start: `npm start` runs `node app.js`)*

### Seed Sample Demo Files (Optional)
```cmd
cd backend
npm run seed:demo
```

### Run Backend Integration Tests
```cmd
cd backend
npm test
```

### Frontend (Port 5173)
```cmd
cd frontend\Group1FS
npm run dev
```

## 2. Full-Stack Offline Demo via Docker Compose (Port 5000)
```cmd
docker compose up --build -d
docker compose exec group1fs npm run seed:demo
```
Open: `http://localhost:5000`
