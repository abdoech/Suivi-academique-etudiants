import { connectDB, closeDB, getDB } from '../config/database.js';

/**
 * Affiche les statistiques globales
 */
async function statsGlobal() {
  try {
    await connectDB();
    const db = getDB();
    const studentsCollection = db.collection('students');
    const coursesCollection = db.collection('courses');
    const gradesCollection = db.collection('grades');

    console.log('\n📊 Statistiques globales du système\n');

    // Compter les étudiants et cours
    const nbStudents = await studentsCollection.countDocuments();
    const nbCourses = await coursesCollection.countDocuments();
    const nbGrades = await gradesCollection.countDocuments();

    // Statistiques globales sur toutes les notes
    const globalStats = await gradesCollection.aggregate([
      {
        $group: {
          _id: null,
          moyenneGenerale: { $avg: '$grade' },
          noteMin: { $min: '$grade' },
          noteMax: { $max: '$grade' },
          nombreNotes: { $sum: 1 }
        }
      }
    ]).toArray();

    // Moyenne par cours
    const moyenneParCours = await gradesCollection.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course_id',
          foreignField: 'course_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      {
        $group: {
          _id: '$course_id',
          nomCours: { $first: '$course.name' },
          moyenne: { $avg: '$grade' },
          nombreNotes: { $sum: 1 }
        }
      },
      { $sort: { moyenne: -1 } }
    ]).toArray();

    // Moyenne par étudiant
    const moyenneParEtudiant = await gradesCollection.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'student_id',
          foreignField: 'student_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $group: {
          _id: '$student_id',
          nom: { $first: { $concat: ['$student.first_name', ' ', '$student.last_name'] } },
          moyenne: { $avg: '$grade' },
          nombreNotes: { $sum: 1 }
        }
      },
      { $sort: { moyenne: -1 } }
    ]).toArray();

    console.log('─'.repeat(70));
    console.log('📈 Vue d\'ensemble:');
    console.log(`   Nombre d'étudiants: ${nbStudents}`);
    console.log(`   Nombre de cours: ${nbCourses}`);
    console.log(`   Nombre total de notes: ${nbGrades}`);
    console.log('─'.repeat(70));

    if (globalStats.length > 0 && globalStats[0].nombreNotes > 0) {
      const stat = globalStats[0];
      console.log('\n📊 Statistiques globales des notes:');
      console.log(`   Moyenne générale: ${stat.moyenneGenerale.toFixed(2)}/20`);
      console.log(`   Note minimale: ${stat.noteMin}/20`);
      console.log(`   Note maximale: ${stat.noteMax}/20`);
    }

    if (moyenneParCours.length > 0) {
      console.log('\n📚 Moyennes par cours:');
      console.log('─'.repeat(70));
      moyenneParCours.forEach(cours => {
        console.log(`   ${cours.nomCours.padEnd(30)} | Moyenne: ${cours.moyenne.toFixed(2)}/20 | ${cours.nombreNotes} note(s)`);
      });
    }

    if (moyenneParEtudiant.length > 0) {
      console.log('\n👤 Moyennes par étudiant:');
      console.log('─'.repeat(70));
      moyenneParEtudiant.forEach(etudiant => {
        const status = etudiant.moyenne >= 10 ? '✅' : '⚠️';
        console.log(`   ${status} ${etudiant.nom.padEnd(25)} (${etudiant._id}) | Moyenne: ${etudiant.moyenne.toFixed(2)}/20 | ${etudiant.nombreNotes} note(s)`);
      });
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await closeDB();
  }
}

statsGlobal();
