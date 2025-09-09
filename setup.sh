#!/bin/bash
openssl rand -base64 756 > mongo-keyfile
chmod 400 mongo-keyfile
docker-compose down -v && docker-compose up -d
MONGODB_INITDB_ROOT_USERNAME=root
MONGODB_INITDB_ROOT_PASSWORD=example
sleep 15s && docker exec -u root mongo1 mongosh "mongodb://${MONGODB_INITDB_ROOT_USERNAME}:${MONGODB_INITDB_ROOT_PASSWORD}@127.0.0.1:27017/admin?serverSelectionTimeoutMS=2000" --eval 'load("/etc/init-mongo.js")'
#final connection string "mongodb://root:example@mongo1:27017,mongo2:27017,mongo3:27017/admin?replicaSet=rs0"