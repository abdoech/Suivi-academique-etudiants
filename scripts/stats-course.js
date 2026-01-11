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
 * Affiche les statistiques d'un cours
 */
async function statsCourse() {
  try {
    await connectDB();
    const db = getDB();
    const coursesCollection = db.collection('courses');
    const gradesCollection = db.collection('grades');
    const studentsCollection = db.collection('students');

    console.log('\n📊 Statistiques par cours\n');

    const courseId = await question('ID cours: ');

    // Vérifier que le cours existe
    const course = await coursesCollection.findOne({ course_id: courseId });
    if (!course) {
      console.log(`❌ Erreur: Le cours ${courseId} n'existe pas`);
      rl.close();
      await closeDB();
      return;
    }

    // Agrégation pour obtenir les statistiques du cours
    const stats = await gradesCollection.aggregate([
      { $match: { course_id: courseId } },
      {
        $group: {
          _id: null,
          moyenne: { $avg: '$grade' },
          noteMin: { $min: '$grade' },
          noteMax: { $max: '$grade' },
          nombreNotes: { $sum: 1 },
          nombreEtudiants: { $addToSet: '$student_id' }
        }
      },
      {
        $project: {
          moyenne: 1,
          noteMin: 1,
          noteMax: 1,
          nombreNotes: 1,
          nombreEtudiants: { $size: '$nombreEtudiants' }
        }
      }
    ]).toArray();

    // Obtenir les notes détaillées avec les noms des étudiants
    const gradesDetails = await gradesCollection.aggregate([
      { $match: { course_id: courseId } },
      {
        $lookup: {
          from: 'students',
          localField: 'student_id',
          foreignField: 'student_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      { $sort: { grade: -1 } }
    ]).toArray();

    console.log(`\n📚 Cours: ${course.name} (${courseId}) - ${course.credits} crédit(s)\n`);

    if (stats.length === 0 || stats[0].nombreNotes === 0) {
      console.log('📋 Aucune note enregistrée pour ce cours');
    } else {
      const stat = stats[0];
      console.log('─'.repeat(70));
      console.log(`📊 Statistiques du cours:`);
      console.log(`   Moyenne de la classe: ${stat.moyenne.toFixed(2)}/20`);
      console.log(`   Note minimale: ${stat.noteMin}/20`);
      console.log(`   Note maximale: ${stat.noteMax}/20`);
      console.log(`   Nombre de notes: ${stat.nombreNotes}`);
      console.log(`   Nombre d'étudiants: ${stat.nombreEtudiants}`);
      
      // Calcul du taux de réussite (>= 10/20)
      const reussite = gradesDetails.filter(g => g.grade >= 10).length;
      const tauxReussite = (reussite / stat.nombreNotes) * 100;
      console.log(`   Taux de réussite: ${tauxReussite.toFixed(1)}% (${reussite}/${stat.nombreNotes})`);
      console.log('─'.repeat(70));

      console.log(`\n📝 Notes des étudiants (triées par note décroissante):\n`);
      gradesDetails.forEach(grade => {
        const dateStr = grade.date.toISOString().split('T')[0];
        const status = grade.grade >= 10 ? '✅' : '❌';
        console.log(`   ${status} ${grade.student.first_name} ${grade.student.last_name.padEnd(15)} (${grade.student.student_id}) | ${grade.grade.toString().padStart(5)}/20 | ${dateStr}`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    rl.close();
    await closeDB();
  }
}

statsCourse();
