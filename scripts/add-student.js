import { connectDB, closeDB, getDB } from '../config/database.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Ajoute un nouvel étudiant
 */
async function addStudent() {
  try {
    await connectDB();
    const db = getDB();
    const studentsCollection = db.collection('students');

    console.log('\n📝 Ajout d\'un nouvel étudiant\n');

    const studentId = await question('ID étudiant (ex: S006): ');
    const firstName = await question('Prénom: ');
    const lastName = await question('Nom: ');

    if (!studentId || !firstName || !lastName) {
      console.log('❌ Tous les champs sont requis');
      rl.close();
      await closeDB();
      return;
    }

    const student = {
      student_id: studentId,
      first_name: firstName,
      last_name: lastName
    };

    const result = await studentsCollection.insertOne(student);
    
    if (result.acknowledged) {
      console.log(`\n✅ Étudiant ajouté avec succès: ${firstName} ${lastName} (${studentId})`);
    } else {
      console.log('\n❌ Erreur lors de l\'ajout de l\'étudiant');
    }

  } catch (error) {
    if (error.code === 11000) {
      console.log('\n❌ Erreur: Un étudiant avec cet ID existe déjà');
    } else {
      console.error('❌ Erreur:', error.message);
    }
  } finally {
    rl.close();
    await closeDB();
  }
}

addStudent();
