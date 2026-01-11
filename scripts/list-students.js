import { connectDB, closeDB, getDB } from '../config/database.js';

/**
 * Liste tous les étudiants
 */
async function listStudents() {
  try {
    await connectDB();
    const db = getDB();
    const studentsCollection = db.collection('students');

    const students = await studentsCollection.find({}).sort({ student_id: 1 }).toArray();

    if (students.length === 0) {
      console.log('\n📋 Aucun étudiant trouvé');
    } else {
      console.log('\n📋 Liste des étudiants:\n');
      console.log('─'.repeat(50));
      students.forEach(student => {
        console.log(`ID: ${student.student_id.padEnd(6)} | ${student.first_name} ${student.last_name}`);
      });
      console.log('─'.repeat(50));
      console.log(`\nTotal: ${students.length} étudiant(s)`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await closeDB();
  }
}

listStudents();
