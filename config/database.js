import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'academic_tracking';

let client = null;
let db = null;

/**
 * Connexion à la base de données MongoDB
 */
export async function connectDB() {
  try {
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
      db = client.db(dbName);
      console.log(`✅ Connecté à MongoDB: ${dbName}`);
    }
    return db;
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error);
    throw error;
  }
}

/**
 * Fermeture de la connexion
 */
export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ Connexion fermée');
  }
}

/**
 * Obtention de l'instance de la base de données
 */
export function getDB() {
  if (!db) {
    throw new Error('Base de données non connectée. Appelez connectDB() d\'abord.');
  }
  return db;
}
