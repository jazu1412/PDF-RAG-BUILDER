import mongoose from "mongoose";

const uri = process.env.MONGO_URL;
console.log("we are going to print mongo string url");
console.log(uri);
if (!uri) {
  console.error("MONGO_URL environment variable is not set");
  process.exit(1);
}

if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
  console.error("Invalid MONGO_URL format. It should start with 'mongodb://' or 'mongodb+srv://'");
  process.exit(1);
}

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log("Connected successfully to MongoDB");
});

export default db;
