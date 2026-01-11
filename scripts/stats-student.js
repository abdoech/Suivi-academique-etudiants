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
 * Affiche les statistiques d'un étudiant
 */
async function statsStudent() {
  try {
    await connectDB();
    const db = getDB();
    const studentsCollection = db.collection('students');
    const gradesCollection = db.collection('grades');
    const coursesCollection = db.collection('courses');

    console.log('\n📊 Statistiques par étudiant\n');

    const studentId = await question('ID étudiant: ');

    // Vérifier que l'étudiant existe
    const student = await studentsCollection.findOne({ student_id: studentId });
    if (!student) {
      console.log(`❌ Erreur: L'étudiant ${studentId} n'existe pas`);
      rl.close();
      await closeDB();
      return;
    }

    // Agrégation pour obtenir les statistiques
    const stats = await gradesCollection.aggregate([
      { $match: { student_id: studentId } },
      {
        $group: {
          _id: null,
          moyenne: { $avg: '$grade' },
          noteMin: { $min: '$grade' },
          noteMax: { $max: '$grade' },
          nombreNotes: { $sum: 1 }
        }
      }
    ]).toArray();

    // Obtenir les notes détaillées avec les noms des cours
    const gradesDetails = await gradesCollection.aggregate([
      { $match: { student_id: studentId } },
      {
        $lookup: {
          from: 'courses',
          localField: 'course_id',
          foreignField: 'course_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      { $sort: { date: -1 } }
    ]).toArray();

    console.log(`\n👤 Étudiant: ${student.first_name} ${student.last_name} (${studentId})\n`);

    if (stats.length === 0 || stats[0].nombreNotes === 0) {
      console.log('📋 Aucune note enregistrée pour cet étudiant');
    } else {
      const stat = stats[0];
      console.log('─'.repeat(60));
      console.log(`📊 Statistiques globales:`);
      console.log(`   Moyenne générale: ${stat.moyenne.toFixed(2)}/20`);
      console.log(`   Note minimale: ${stat.noteMin}/20`);
      console.log(`   Note maximale: ${stat.noteMax}/20`);
      console.log(`   Nombre de notes: ${stat.nombreNotes}`);
      console.log('─'.repeat(60));

      console.log(`\n📝 Détail des notes:\n`);
      gradesDetails.forEach(grade => {
        const dateStr = grade.date.toISOString().split('T')[0];
        console.log(`   ${grade.course.name.padEnd(25)} | ${grade.grade.toString().padStart(5)}/20 | ${dateStr}`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    rl.close();
    await closeDB();
  }
}

statsStudent();
