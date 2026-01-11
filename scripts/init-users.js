import { connectDB, closeDB, getDB } from '../config/database.js';
import { hashPassword } from '../config/auth.js';

/**
 * Initialise les utilisateurs par défaut
 */
async function initUsers() {
  try {
    await connectDB();
    const db = getDB();
    const usersCollection = db.collection('users');

    // Créer l'index unique sur username
    await usersCollection.createIndex({ username: 1 }, { unique: true });

    // Utilisateur admin par défaut
    const adminPassword = await hashPassword('admin123');
    const admin = {
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      created_at: new Date()
    };

    // Vérifier si l'admin existe déjà
    const existingAdmin = await usersCollection.findOne({ username: 'admin' });
    if (!existingAdmin) {
      await usersCollection.insertOne(admin);
      console.log('✅ Utilisateur admin créé:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   ⚠️  Changez le mot de passe après la première connexion!');
    } else {
      console.log('ℹ️  Utilisateur admin existe déjà');
    }

    // Utilisateur enseignant par défaut
    const teacherPassword = await hashPassword('teacher123');
    const teacher = {
      username: 'teacher',
      password: teacherPassword,
      role: 'teacher',
      created_at: new Date()
    };

    const existingTeacher = await usersCollection.findOne({ username: 'teacher' });
    if (!existingTeacher) {
      await usersCollection.insertOne(teacher);
      console.log('✅ Utilisateur enseignant créé:');
      console.log('   Username: teacher');
      console.log('   Password: teacher123');
    } else {
      console.log('ℹ️  Utilisateur enseignant existe déjà');
    }

    console.log('\n🎉 Initialisation des utilisateurs terminée!');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
  } finally {
    await closeDB();
  }
}

initUsers();
