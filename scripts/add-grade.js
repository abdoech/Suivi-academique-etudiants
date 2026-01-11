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
 * Ajoute une nouvelle note
 */
async function addGrade() {
  try {
    await connectDB();
    const db = getDB();
    const gradesCollection = db.collection('grades');
    const studentsCollection = db.collection('students');
    const coursesCollection = db.collection('courses');

    console.log('\n📝 Ajout d\'une nouvelle note\n');

    const studentId = await question('ID étudiant: ');
    const courseId = await question('ID cours: ');
    const gradeStr = await question('Note (0-20): ');
    const dateStr = await question('Date (YYYY-MM-DD) ou appuyez sur Entrée pour aujourd\'hui: ');

    // Vérifier que l'étudiant existe
    const student = await studentsCollection.findOne({ student_id: studentId });
    if (!student) {
      console.log(`❌ Erreur: L'étudiant ${studentId} n'existe pas`);
      rl.close();
      await closeDB();
      return;
    }

    // Vérifier que le cours existe
    const course = await coursesCollection.findOne({ course_id: courseId });
    if (!course) {
      console.log(`❌ Erreur: Le cours ${courseId} n'existe pas`);
      rl.close();
      await closeDB();
      return;
    }

    const grade = parseFloat(gradeStr);
    if (isNaN(grade) || grade < 0 || grade > 20) {
      console.log('❌ La note doit être un nombre entre 0 et 20');
      rl.close();
      await closeDB();
      return;
    }

    const date = dateStr ? new Date(dateStr) : new Date();

    const gradeDoc = {
      student_id: studentId,
      course_id: courseId,
      grade: grade,
      date: date
    };

    const result = await gradesCollection.insertOne(gradeDoc);
    
    if (result.acknowledged) {
      console.log(`\n✅ Note ajoutée avec succès: ${grade}/20 pour ${student.first_name} ${student.last_name} en ${course.name}`);
    } else {
      console.log('\n❌ Erreur lors de l\'ajout de la note');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    rl.close();
    await closeDB();
  }
}

addGrade();
