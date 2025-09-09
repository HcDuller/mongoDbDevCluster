#!/bin/bash
set -e

HOSTS_FILE="/etc/hosts"

add_host_entry() {
  local entry="$1"
  local host="$2"

  if ! grep -q "[[:space:]]$host" "$HOSTS_FILE"; then
    echo "Adding $entry to $HOSTS_FILE"
    echo "$entry" | sudo tee -a "$HOSTS_FILE" >/dev/null
  else
    echo "$host already present in $HOSTS_FILE"
  fi
}

add_host_entry "127.0.0.1 mongo1" "mongo1"
add_host_entry "127.0.0.1 mongo2" "mongo2"
add_host_entry "127.0.0.1 mongo3" "mongo3"


if [ ! -f mongo-keyfile ]; then
  echo "mongo-keyfile not found, creating..."
  openssl rand -base64 756 > mongo-keyfile
  chmod 400 mongo-keyfile
else
  echo "mongo-keyfile already exists, skipping."
fi


set -a
if [ ! -f ./.env ]; then
  echo ".env file not found, exiting setup"
  exit 1
else
  REQUIRED_VARS="MONGODB_INITDB_ROOT_USERNAME MONGODB_INITDB_ROOT_PASSWORD"
  source ./.env
  missing=0
  for var in $REQUIRED_VARS; do
    if [ -z "${!var}" ]; then
      echo "❌ Environment variable $var is not set or not exported."
      missing=1
    else
      echo "✅ $var was declared"
    fi
  done
  if [ "$missing" -ne 0 ]; then
    echo "Exiting: missing required environment variables."
    exit 1
  fi
  echo "🎉 All required environment variables are set."
fi
set +a

docker-compose down -v && docker-compose up -d
sleep 15s && docker exec -u root mongo1 mongosh "mongodb://${MONGODB_INITDB_ROOT_USERNAME}:${MONGODB_INITDB_ROOT_PASSWORD}@127.0.0.1:27017/admin?serverSelectionTimeoutMS=2000" --eval 'load("/etc/init-mongo.js")'
#final connection string "mongodb://user:psw@mongo1:27017,mongo2:27017,mongo3:27017/admin?replicaSet=rs0"