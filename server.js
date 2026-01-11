import express from 'express';
import { connectDB, getDB } from './config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { ObjectId } from 'mongodb';
import { hashPassword, comparePassword, generateToken, authenticateToken, requireAdmin } from './config/auth.js';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Middleware pour logger les requêtes API (debug)
app.use('/api', (req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`);
  next();
});

// Routes d'authentification (publiques) - DOIT être avant les autres routes
// Inscription
app.post('/api/auth/register', async (req, res) => {
  try {
    const db = await getDatabase();
    const { username, password, role = 'teacher' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username et password requis' });
    }
    
    // Vérifier si l'utilisateur existe déjà
    const existing = await db.collection('users').findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Ce nom d\'utilisateur existe déjà' });
    }
    
    // Créer l'utilisateur
    const hashedPassword = await hashPassword(password);
    const user = {
      username,
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'teacher',
      created_at: new Date()
    };
    
    const result = await db.collection('users').insertOne(user);
    const token = generateToken({ _id: result.insertedId, username, role: user.role });
    
    res.json({ success: true, token, user: { username, role: user.role } });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Connexion
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Tentative de connexion reçue');
    console.log('📋 Body:', req.body);
    const db = await getDatabase();
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('❌ Champs manquants');
      return res.status(400).json({ error: 'Username et password requis' });
    }
    
    console.log('🔍 Recherche de l\'utilisateur:', username);
    // Trouver l'utilisateur
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    console.log('✅ Utilisateur trouvé, vérification du mot de passe...');
    // Vérifier le mot de passe
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      console.log('❌ Mot de passe incorrect');
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    console.log('✅ Mot de passe correct, génération du token...');
    // Générer le token
    const token = generateToken({ _id: user._id, username: user.username, role: user.role });
    
    console.log('✅ Connexion réussie pour:', username);
    res.json({ 
      success: true, 
      token, 
      user: { 
        username: user.username, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Vérifier le token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Connexion à la base de données au démarrage
connectDB().then(() => {
  console.log('✅ Base de données connectée pour le serveur');
}).catch(err => {
  console.error('❌ Erreur de connexion à la base de données:', err);
});

// Helper pour obtenir la DB (avec reconnexion si nécessaire)
async function getDatabase() {
  try {
    const db = getDB();
    // Vérifier que la connexion est active
    await db.admin().ping();
    return db;
  } catch (error) {
    console.log('⚠️ Reconnexion à la base de données...');
    // Si pas connecté, se reconnecter
    await connectDB();
    const db = getDB();
    await db.admin().ping();
    console.log('✅ Reconnexion réussie');
    return db;
  }
}

// Routes API

// Liste des étudiants
app.get('/api/students', async (req, res) => {
  try {
    const db = await getDatabase();
    const students = await db.collection('students')
      .find({})
      .sort({ student_id: 1 })
      .toArray();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Liste des cours
app.get('/api/courses', async (req, res) => {
  try {
    const db = await getDatabase();
    const courses = await db.collection('courses')
      .find({})
      .sort({ course_id: 1 })
      .toArray();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notes d'un étudiant
app.get('/api/students/:studentId/grades', async (req, res) => {
  try {
    const db = await getDatabase();
    const { studentId } = req.params;
    const grades = await db.collection('grades')
      .aggregate([
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
      ])
      .toArray();
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistiques d'un étudiant
app.get('/api/students/:studentId/stats', async (req, res) => {
  try {
    const db = await getDatabase();
    const { studentId } = req.params;
    const stats = await db.collection('grades')
      .aggregate([
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
      ])
      .toArray();
    
    const student = await db.collection('students')
      .findOne({ student_id: studentId });
    
    res.json({
      student,
      stats: stats[0] || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notes d'un cours
app.get('/api/courses/:courseId/grades', async (req, res) => {
  try {
    const db = await getDatabase();
    const { courseId } = req.params;
    const grades = await db.collection('grades')
      .aggregate([
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
      ])
      .toArray();
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistiques d'un cours
app.get('/api/courses/:courseId/stats', async (req, res) => {
  try {
    const db = await getDatabase();
    const { courseId } = req.params;
    const stats = await db.collection('grades')
      .aggregate([
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
      ])
      .toArray();
    
    const course = await db.collection('courses')
      .findOne({ course_id: courseId });
    
    res.json({
      course,
      stats: stats[0] || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistiques globales
app.get('/api/stats/global', async (req, res) => {
  try {
    const db = await getDatabase();
    const nbStudents = await db.collection('students').countDocuments();
    const nbCourses = await db.collection('courses').countDocuments();
    const nbGrades = await db.collection('grades').countDocuments();

    const globalStats = await db.collection('grades')
      .aggregate([
        {
          $group: {
            _id: null,
            moyenneGenerale: { $avg: '$grade' },
            noteMin: { $min: '$grade' },
            noteMax: { $max: '$grade' },
            nombreNotes: { $sum: 1 }
          }
        }
      ])
      .toArray();

    const moyenneParCours = await db.collection('grades')
      .aggregate([
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
      ])
      .toArray();

    const moyenneParEtudiant = await db.collection('grades')
      .aggregate([
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
      ])
      .toArray();

    res.json({
      overview: {
        nbStudents,
        nbCourses,
        nbGrades
      },
      globalStats: globalStats[0] || null,
      moyenneParCours,
      moyenneParEtudiant
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ajouter un étudiant
app.post('/api/students', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const { student_id, first_name, last_name } = req.body;
    if (!student_id || !first_name || !last_name) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    const result = await db.collection('students').insertOne({
      student_id,
      first_name,
      last_name
    });
    console.log('✅ Étudiant ajouté:', student_id);
    res.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('❌ Erreur ajout étudiant:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Un étudiant avec cet ID existe déjà' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Ajouter un cours
app.post('/api/courses', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const { course_id, name, credits } = req.body;
    if (!course_id || !name || !credits) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    const result = await db.collection('courses').insertOne({
      course_id,
      name,
      credits: parseInt(credits)
    });
    console.log('✅ Cours ajouté:', course_id);
    res.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('❌ Erreur ajout cours:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Un cours avec cet ID existe déjà' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Ajouter une note
app.post('/api/grades', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const { student_id, course_id, grade, date } = req.body;
    if (!student_id || !course_id || grade === undefined) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    
    // Vérifier que l'étudiant existe
    const student = await db.collection('students').findOne({ student_id });
    if (!student) {
      return res.status(404).json({ error: 'Étudiant non trouvé' });
    }
    
    // Vérifier que le cours existe
    const course = await db.collection('courses').findOne({ course_id });
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }
    
    const result = await db.collection('grades').insertOne({
      student_id,
      course_id,
      grade: parseFloat(grade),
      date: date ? new Date(date) : new Date()
    });
    console.log('✅ Note ajoutée:', { student_id, course_id, grade });
    res.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('❌ Erreur ajout note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Modifier un étudiant
app.put('/api/students/:studentId', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const { studentId } = req.params;
    const { first_name, last_name } = req.body;
    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    const result = await db.collection('students').updateOne(
      { student_id: studentId },
      { $set: { first_name, last_name } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Étudiant non trouvé' });
    }
    console.log('✅ Étudiant modifié:', studentId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur modification étudiant:', error);
    res.status(500).json({ error: error.message });
  }
});

// Supprimer un étudiant
app.delete('/api/students/:studentId', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const { studentId } = req.params;
    console.log('🗑️ Tentative de suppression étudiant:', studentId);
    
    // Vérifier que l'étudiant existe d'abord
    const student = await db.collection('students').findOne({ student_id: studentId });
    if (!student) {
      console.log('❌ Étudiant non trouvé:', studentId);
      return res.status(404).json({ error: 'Étudiant non trouvé' });
    }
    
    // Supprimer toutes les notes de l'étudiant
    const deletedGrades = await db.collection('grades').deleteMany({ student_id: studentId });
    console.log(`📝 ${deletedGrades.deletedCount} note(s) supprimée(s) pour l'étudiant ${studentId}`);
    
    // Supprimer l'étudiant
    console.log('🗑️ Suppression de l\'étudiant dans la collection students...');
    console.log('📊 Nom de la base:', db.databaseName);
    console.log('📊 Collection:', 'students');
    console.log('📊 Filtre de suppression:', { student_id: studentId });
    const result = await db.collection('students').deleteOne({ student_id: studentId });
    console.log('📊 Résultat suppression étudiant:', JSON.stringify(result, null, 2));
    console.log('📊 deletedCount:', result.deletedCount);
    console.log('📊 acknowledged:', result.acknowledged);
    
    if (result.deletedCount === 0) {
      console.log('❌ Échec de la suppression de l\'étudiant:', studentId);
      console.log('❌ Résultat complet:', JSON.stringify(result, null, 2));
      return res.status(404).json({ error: 'Étudiant non trouvé ou déjà supprimé' });
    }
    
    // Vérifier que l'étudiant a bien été supprimé
    const verify = await db.collection('students').findOne({ student_id: studentId });
    if (verify) {
      console.log('⚠️ ATTENTION: L\'étudiant existe encore après suppression!', verify);
      return res.status(500).json({ error: 'Erreur: l\'étudiant n\'a pas été supprimé de la base de données' });
    }
    
    console.log('✅ Étudiant supprimé avec succès:', studentId);
    console.log('✅ Vérification: l\'étudiant n\'existe plus dans la base');
    res.json({ success: true, deletedGrades: deletedGrades.deletedCount });
  } catch (error) {
    console.error('❌ Erreur suppression étudiant:', error);
    res.status(500).json({ error: error.message });
  }
});

// Modifier un cours
app.put('/api/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const { courseId } = req.params;
    const { name, credits } = req.body;
    if (!name || !credits) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    const result = await db.collection('courses').updateOne(
      { course_id: courseId },
      { $set: { name, credits: parseInt(credits) } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }
    console.log('✅ Cours modifié:', courseId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur modification cours:', error);
    res.status(500).json({ error: error.message });
  }
});

// Supprimer un cours
app.delete('/api/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const { courseId } = req.params;
    console.log('🗑️ Tentative de suppression cours:', courseId);
    
    // Vérifier que le cours existe d'abord
    const course = await db.collection('courses').findOne({ course_id: courseId });
    if (!course) {
      console.log('❌ Cours non trouvé:', courseId);
      return res.status(404).json({ error: 'Cours non trouvé' });
    }
    
    // Supprimer toutes les notes du cours
    const deletedGrades = await db.collection('grades').deleteMany({ course_id: courseId });
    console.log(`📝 ${deletedGrades.deletedCount} note(s) supprimée(s) pour le cours ${courseId}`);
    
    // Supprimer le cours
    const result = await db.collection('courses').deleteOne({ course_id: courseId });
    if (result.deletedCount === 0) {
      console.log('❌ Échec de la suppression du cours:', courseId);
      return res.status(404).json({ error: 'Cours non trouvé' });
    }
    console.log('✅ Cours supprimé avec succès:', courseId);
    res.json({ success: true, deletedGrades: deletedGrades.deletedCount });
  } catch (error) {
    console.error('❌ Erreur suppression cours:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtenir une note par ID
app.get('/api/grades/:gradeId', async (req, res) => {
  try {
    const db = await getDatabase();
    const { gradeId } = req.params;
    const grade = await db.collection('grades').findOne({ _id: new ObjectId(gradeId) });
    if (!grade) {
      return res.status(404).json({ error: 'Note non trouvée' });
    }
    res.json(grade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Modifier une note
app.put('/api/grades/:gradeId', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const { gradeId } = req.params;
    const { student_id, course_id, grade, date } = req.body;
    const result = await db.collection('grades').updateOne(
      { _id: new ObjectId(gradeId) },
      { 
        $set: { 
          student_id,
          course_id,
          grade: parseFloat(grade),
          date: date ? new Date(date) : new Date()
        } 
      }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Note non trouvée' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une note
app.delete('/api/grades/:gradeId', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const { gradeId } = req.params;
    console.log('🗑️ Tentative de suppression note:', gradeId);
    
    // Vérifier que la note existe d'abord
    const grade = await db.collection('grades').findOne({ _id: new ObjectId(gradeId) });
    if (!grade) {
      console.log('❌ Note non trouvée:', gradeId);
      return res.status(404).json({ error: 'Note non trouvée' });
    }
    
    // Supprimer la note
    const result = await db.collection('grades').deleteOne({ _id: new ObjectId(gradeId) });
    if (result.deletedCount === 0) {
      console.log('❌ Échec de la suppression de la note:', gradeId);
      return res.status(404).json({ error: 'Note non trouvée' });
    }
    console.log('✅ Note supprimée avec succès:', gradeId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur suppression note:', error);
    if (error.message.includes('ObjectId')) {
      return res.status(400).json({ error: 'ID de note invalide' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Export PDF
app.get('/api/export/pdf', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const { type, id } = req.query; // type: 'student', 'course', 'global'
    
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=export_${type}_${id || 'global'}.pdf`);
    
    doc.pipe(res);
    
    // En-tête
    doc.fontSize(20).text('Rapport Académique', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.moveDown(2);
    
    if (type === 'student' && id) {
      const student = await db.collection('students').findOne({ student_id: id });
      if (student) {
        const stats = await db.collection('grades').aggregate([
          { $match: { student_id: id } },
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
        
        const grades = await db.collection('grades').aggregate([
          { $match: { student_id: id } },
          {
            $lookup: {
              from: 'courses',
              localField: 'course_id',
              foreignField: 'course_id',
              as: 'course'
            }
          },
          { $unwind: '$course' }
        ]).toArray();
        
        doc.fontSize(16).text(`Étudiant: ${student.first_name} ${student.last_name}`);
        doc.text(`ID: ${student.student_id}`);
        doc.moveDown();
        
        if (stats[0]) {
          doc.fontSize(14).text('Statistiques:');
          doc.text(`Moyenne: ${stats[0].moyenne.toFixed(2)}/20`);
          doc.text(`Note minimale: ${stats[0].noteMin}/20`);
          doc.text(`Note maximale: ${stats[0].noteMax}/20`);
          doc.moveDown();
        }
        
        if (grades && grades.length > 0) {
          doc.fontSize(14).text('Notes détaillées:');
          grades.forEach(g => {
            doc.text(`${g.course.name}: ${g.grade}/20 - ${new Date(g.date).toLocaleDateString('fr-FR')}`);
          });
        }
      }
    } else if (type === 'global') {
      const stats = await db.collection('grades').aggregate([
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
      
      if (stats[0]) {
        doc.fontSize(14).text('Statistiques globales:');
        doc.text(`Moyenne générale: ${stats[0].moyenneGenerale.toFixed(2)}/20`);
        doc.text(`Note minimale: ${stats[0].noteMin}/20`);
        doc.text(`Note maximale: ${stats[0].noteMax}/20`);
        doc.text(`Nombre total de notes: ${stats[0].nombreNotes}`);
      }
    }
    
    doc.end();
  } catch (error) {
    console.error('Erreur export PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route principale - servir l'interface web
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware pour gérer les routes API non trouvées (404) - DOIT être en DERNIER
app.use('/api', (req, res) => {
  console.log(`❌ Route API non trouvée: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route API non trouvée', 
    path: req.path, 
    method: req.method,
    availableRoutes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/verify',
      'GET /api/students',
      'POST /api/students',
      'PUT /api/students/:studentId',
      'DELETE /api/students/:studentId',
      'GET /api/courses',
      'POST /api/courses',
      'PUT /api/courses/:courseId',
      'DELETE /api/courses/:courseId',
      'POST /api/grades',
      'PUT /api/grades/:gradeId',
      'DELETE /api/grades/:gradeId',
      'GET /api/export/pdf'
    ]
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📊 Interface web disponible à http://localhost:${PORT}`);
  console.log(`📡 Routes API disponibles:`);
  console.log(`   POST   /api/auth/register`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   GET    /api/auth/verify`);
  console.log(`   GET    /api/students`);
  console.log(`   POST   /api/students`);
  console.log(`   PUT    /api/students/:studentId`);
  console.log(`   DELETE /api/students/:studentId`);
  console.log(`   GET    /api/courses`);
  console.log(`   POST   /api/courses`);
  console.log(`   PUT    /api/courses/:courseId`);
  console.log(`   DELETE /api/courses/:courseId`);
  console.log(`   POST   /api/grades`);
  console.log(`   PUT    /api/grades/:gradeId`);
  console.log(`   DELETE /api/grades/:gradeId`);
  console.log(`   GET    /api/export/pdf`);
});
