import { connectDB, closeDB, getDB } from '../config/database.js';

/**
 * Initialise la base de données avec des données d'exemple
 */
async function initDatabase() {
  try {
    await connectDB();
    const db = getDB();

    // Collections
    const studentsCollection = db.collection('students');
    const coursesCollection = db.collection('courses');
    const gradesCollection = db.collection('grades');

    // Supprimer les collections existantes (optionnel - pour réinitialiser)
    console.log('🗑️  Suppression des collections existantes...');
    await studentsCollection.deleteMany({});
    await coursesCollection.deleteMany({});
    await gradesCollection.deleteMany({});

    // Créer les index
    console.log('📇 Création des index...');
    await studentsCollection.createIndex({ student_id: 1 }, { unique: true });
    await coursesCollection.createIndex({ course_id: 1 }, { unique: true });
    await gradesCollection.createIndex({ student_id: 1 });
    await gradesCollection.createIndex({ course_id: 1 });
    await gradesCollection.createIndex({ date: 1 });

    // Données d'exemple - Étudiants
    const students = [
      {
        student_id: 'S001',
        first_name: 'Alice',
        last_name: 'Martin'
      },
      {
        student_id: 'S002',
        first_name: 'Bob',
        last_name: 'Dupont'
      },
      {
        student_id: 'S003',
        first_name: 'Claire',
        last_name: 'Bernard'
      },
      {
        student_id: 'S004',
        first_name: 'David',
        last_name: 'Petit'
      },
      {
        student_id: 'S005',
        first_name: 'Emma',
        last_name: 'Moreau'
      }
    ];

    // Données d'exemple - Cours
    const courses = [
      {
        course_id: 'C001',
        name: 'Base de données',
        credits: 4
      },
      {
        course_id: 'C002',
        name: 'Programmation Web',
        credits: 3
      },
      {
        course_id: 'C003',
        name: 'Algorithmes',
        credits: 5
      },
      {
        course_id: 'C004',
        name: 'Réseaux',
        credits: 3
      }
    ];

    // Données d'exemple - Notes
    const grades = [
      // Alice (S001)
      { student_id: 'S001', course_id: 'C001', grade: 16.5, date: new Date('2025-01-15') },
      { student_id: 'S001', course_id: 'C002', grade: 18.0, date: new Date('2025-01-20') },
      { student_id: 'S001', course_id: 'C003', grade: 15.0, date: new Date('2025-02-01') },
      { student_id: 'S001', course_id: 'C004', grade: 17.5, date: new Date('2025-02-10') },
      
      // Bob (S002)
      { student_id: 'S002', course_id: 'C001', grade: 12.0, date: new Date('2025-01-15') },
      { student_id: 'S002', course_id: 'C002', grade: 14.5, date: new Date('2025-01-20') },
      { student_id: 'S002', course_id: 'C003', grade: 11.0, date: new Date('2025-02-01') },
      { student_id: 'S002', course_id: 'C004', grade: 13.0, date: new Date('2025-02-10') },
      
      // Claire (S003)
      { student_id: 'S003', course_id: 'C001', grade: 19.0, date: new Date('2025-01-15') },
      { student_id: 'S003', course_id: 'C002', grade: 17.5, date: new Date('2025-01-20') },
      { student_id: 'S003', course_id: 'C003', grade: 18.5, date: new Date('2025-02-01') },
      { student_id: 'S003', course_id: 'C004', grade: 16.0, date: new Date('2025-02-10') },
      
      // David (S004)
      { student_id: 'S004', course_id: 'C001', grade: 10.5, date: new Date('2025-01-15') },
      { student_id: 'S004', course_id: 'C002', grade: 9.0, date: new Date('2025-01-20') },
      { student_id: 'S004', course_id: 'C003', grade: 8.5, date: new Date('2025-02-01') },
      { student_id: 'S004', course_id: 'C004', grade: 11.0, date: new Date('2025-02-10') },
      
      // Emma (S005)
      { student_id: 'S005', course_id: 'C001', grade: 15.0, date: new Date('2025-01-15') },
      { student_id: 'S005', course_id: 'C002', grade: 16.5, date: new Date('2025-01-20') },
      { student_id: 'S005', course_id: 'C003', grade: 14.0, date: new Date('2025-02-01') },
      { student_id: 'S005', course_id: 'C004', grade: 15.5, date: new Date('2025-02-10') }
    ];

    // Insertion des données
    console.log('📝 Insertion des étudiants...');
    await studentsCollection.insertMany(students);
    console.log(`✅ ${students.length} étudiants insérés`);

    console.log('📝 Insertion des cours...');
    await coursesCollection.insertMany(courses);
    console.log(`✅ ${courses.length} cours insérés`);

    console.log('📝 Insertion des notes...');
    await gradesCollection.insertMany(grades);
    console.log(`✅ ${grades.length} notes insérées`);

    console.log('\n🎉 Base de données initialisée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
  } finally {
    await closeDB();
  }
}

initDatabase();
