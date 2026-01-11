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
 * Ajoute un nouveau cours
 */
async function addCourse() {
  try {
    await connectDB();
    const db = getDB();
    const coursesCollection = db.collection('courses');

    console.log('\n📝 Ajout d\'un nouveau cours\n');

    const courseId = await question('ID cours (ex: C005): ');
    const name = await question('Nom du cours: ');
    const creditsStr = await question('Nombre de crédits: ');

    if (!courseId || !name || !creditsStr) {
      console.log('❌ Tous les champs sont requis');
      rl.close();
      await closeDB();
      return;
    }

    const credits = parseInt(creditsStr);
    if (isNaN(credits) || credits <= 0) {
      console.log('❌ Le nombre de crédits doit être un nombre positif');
      rl.close();
      await closeDB();
      return;
    }

    const course = {
      course_id: courseId,
      name: name,
      credits: credits
    };

    const result = await coursesCollection.insertOne(course);
    
    if (result.acknowledged) {
      console.log(`\n✅ Cours ajouté avec succès: ${name} (${courseId}) - ${credits} crédits`);
    } else {
      console.log('\n❌ Erreur lors de l\'ajout du cours');
    }

  } catch (error) {
    if (error.code === 11000) {
      console.log('\n❌ Erreur: Un cours avec cet ID existe déjà');
    } else {
      console.error('❌ Erreur:', error.message);
    }
  } finally {
    rl.close();
    await closeDB();
  }
}

addCourse();
