#!/bin/bash

echo "Stopping Node.js server with PM2..."
pm2 stop backend-server
pm2 delete backend-server
echo "Server stopped and removed from PM2 process list."
