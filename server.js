// PokéWords SUPREME — direct CommonJS entrypoint for Render.
// Keep this file intentionally tiny so Render's `node server.js`
// always reaches the real V9 server without any VM/eval wrapper.
require('./server-v9.js');
