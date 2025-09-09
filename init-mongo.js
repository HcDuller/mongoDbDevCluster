//log in tiwh "mongodb://${MONGODB_INITDB_ROOT_USERNAME}:${MONGODB_INITDB_ROOT_PASSWORD}@127.0.0.1:27017/admin?serverSelectionTimeoutMS=2000"
var admin

var rootUsr = process.env.MONGODB_INITDB_ROOT_USERNAME ?? 'root';
var rootPsw = process.env.MONGODB_INITDB_ROOT_PASSWORD ?? 'example';
try {
  print("🔄 Authenticating as admin");
  admin = db.getSiblingDB("admin").auth(rootUsr, rootPsw);
} catch (e) {
  console.error(e)
}


// --- Existing replica set initialization code ---
try {
  var status = rs.status();
  if (status.ok !== 1) throw new Error("Replica set not initiated yet");
} catch (e) {
  try {
    print("🔄 Initiating replica set...");
    rs.initiate({
      _id: "rs0",
      members: [
        { _id: 0, host: "mongo1:27017" },
        { _id: 1, host: "mongo2:27017" },
        { _id: 2, host: "mongo3:27017" }
      ]
    });
  } catch (f) {
    print("Could't initialize replica set.")
  }
}

// Connect as root to replica set
const replConn = new Mongo("mongodb://" + process.env.MONGODB_INITDB_ROOT_USERNAME + ":" + process.env.MONGODB_INITDB_ROOT_PASSWORD + "@mongo1:27017,mongo2:27017,mongo3:27017/admin?replicaSet=rs0")
const replAdmin = replConn.getDB("admin");

let retries = 10;
let primaryElected = false;
while (retries-- > 0) {
  const hello = replAdmin.runCommand({ hello: 1 });
  if (hello.isWritablePrimary) {
    primaryElected = true;
    print("✅ Primary elected:", hello.me);
    break;
  }
  print("⏳ Waiting for primary election...");
  sleep(2000);
}

if (primaryElected) {
  const dbName = "ajduller_homologacao";
  const collectionName = "rfb";

  const targetDB = replAdmin.getSiblingDB(dbName);
  if (!targetDB.getUser(process.env.MONGODB_INITDB_ROOT_USERNAME)) {
    print("👤 Creating root user...");
    targetDB.createUser({
      user: process.env.MONGODB_INITDB_ROOT_USERNAME,
      pwd: process.env.MONGODB_INITDB_ROOT_PASSWORD,
      roles: [{ role: "root", db: "admin" }]
    });
  } else {
    print("✅ Root user already exists, skipping...");
  }
  // Create collection if it doesn't exist
  if (!targetDB.getCollectionNames().includes(collectionName)) {
    print(`📂 Creating collection '${collectionName}' in database '${dbName}'`);
    targetDB.createCollection(collectionName);
    targetDB[collectionName].insertOne({ _init: true })
  } else {
    print(`✅ Collection '${collectionName}' already exists`);
  }
}