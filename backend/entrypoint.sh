#!/bin/sh
set -eu
node backend/dist/database/migrate.js
if [ "${DEMO_SEED:-false}" = "true" ]; then
  node backend/dist/database/seed.js
fi
exec node backend/dist/server.js
