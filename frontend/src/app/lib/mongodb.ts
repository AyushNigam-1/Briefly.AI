import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
    let globalWithMongo = global as typeof globalThis & {
        _mongoClient?: MongoClient;
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClient) {
        globalWithMongo._mongoClient = new MongoClient(uri);
        globalWithMongo._mongoClientPromise = globalWithMongo._mongoClient.connect();
    }
    client = globalWithMongo._mongoClient;
    clientPromise = globalWithMongo._mongoClientPromise!;
} else {
    client = new MongoClient(uri);
    clientPromise = client.connect();
}

// 🌟 Extract the synchronous Db instance for Better Auth
export const db = client.db();

// Export all three so you have whatever you need anywhere in your app
export { client, clientPromise };