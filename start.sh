#!/bin/bash

cd /var/services/web/project/backend

echo "Starting Node.js server with PM2..."
pm2 start server.js --name backend-server
echo "Server started with PM2."
