# ⚡ PokéWords — English Adventure

RPG educativo multijugador hecho con Node.js, Express, Socket.IO, HTML5 Canvas y JavaScript.

## 🚀 Ejecutar

```bash
npm install
npm start
```

Luego abre `http://localhost:3000`.

## 🧩 Arquitectura

- `public/index.html` — cliente, mapa, HUD y UI.
- `server-v4.js` — servidor multiplayer autoritativo.
- `server.js` — servidor legacy conservado como referencia.
- `package.json` — arranque y dependencias.

## 🌐 Multiplayer v4

El servidor mantiene el estado de jugadores, valida movimiento, controla el dueño de la sala y expone `/health` para comprobar el estado del servidor.

El protocolo de combate incluye `battleStart`, `battleAnswer`, `battleRun`, `battleStarted`, `battleUpdate`, `battleWon` y `battleLost`.

La intención es que HP, daño, encuentros y recompensas importantes se calculen en el servidor, reduciendo la dependencia del cliente.

## 🛡️ Notas

No pongas secretos, tokens ni credenciales dentro de `public/`. El proyecto está pensado para aprendizaje y prototipado; para producción todavía conviene añadir autenticación real, persistencia de cuentas y rate limiting más avanzado.
