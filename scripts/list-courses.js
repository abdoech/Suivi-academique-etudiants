import { connectDB, closeDB, getDB } from '../config/database.js';

/**
 * Liste tous les cours
 */
async function listCourses() {
  try {
    await connectDB();
    const db = getDB();
    const coursesCollection = db.collection('courses');

    const courses = await coursesCollection.find({}).sort({ course_id: 1 }).toArray();

    if (courses.length === 0) {
      console.log('\n📋 Aucun cours trouvé');
    } else {
      console.log('\n📋 Liste des cours:\n');
      console.log('─'.repeat(60));
      courses.forEach(course => {
        console.log(`ID: ${course.course_id.padEnd(6)} | ${course.name.padEnd(30)} | ${course.credits} crédit(s)`);
      });
      console.log('─'.repeat(60));
      console.log(`\nTotal: ${courses.length} cours`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await closeDB();
  }
}

listCourses();
