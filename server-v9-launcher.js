// V9 server entrypoint.
// Load the CommonJS server normally; do not execute it through vm,
// because server-v9.js relies on require(), __dirname and module scope.
require('./server-v9.js');
