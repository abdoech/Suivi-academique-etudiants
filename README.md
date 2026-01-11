# 📚 Système de Suivi Académique des Étudiants

Un système de gestion et de suivi des notes d'étudiants utilisant MongoDB, conçu pour les débutants en bases de données NoSQL.

## 🎯 Objectifs du projet

- Gérer les étudiants, les cours et les notes
- Calculer des moyennes, min/max par étudiant ou par cours
- Visualiser les statistiques académiques
- Utiliser les fonctionnalités d'agrégation MongoDB (`$group`, `$avg`, `$min`, `$max`)

## 📋 Prérequis

- Node.js (version 14 ou supérieure)
- MongoDB installé et en cours d'exécution (localement ou MongoDB Atlas)

## 🚀 Installation

1. **Cloner ou télécharger le projet**

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer MongoDB**
   
   Par défaut, le projet se connecte à `mongodb://localhost:27017` avec la base de données `academic_tracking`.
   
   Pour personnaliser la connexion, créez un fichier `.env` :
   ```
   MONGODB_URI=mongodb://localhost:27017
   DB_NAME=academic_tracking
   JWT_SECRET=votre-secret-jwt-changez-en-production
   ```

4. **Initialiser la base de données et les utilisateurs**
   ```bash
   npm run init-all
   ```
   
   Ou séparément :
   ```bash
   npm run init          # Initialise les données d'exemple
   npm run init-users    # Initialise les utilisateurs par défaut
   ```

5. **Démarrer l'application web**
   ```bash
   npm start
   ```

6. **Se connecter à l'application**
   - Ouvrez http://localhost:3000
   - Utilisez les identifiants par défaut :
     - **Admin** : `admin` / `admin123`
     - **Enseignant** : `teacher` / `teacher123`
   - ⚠️ **Changez ces mots de passe après la première connexion !**

## 📖 Utilisation

### Commandes disponibles

#### Gestion des données

- **Initialiser la base de données** (avec données d'exemple)
  ```bash
  npm run init
  ```

- **Ajouter un étudiant**
  ```bash
  npm run add-student
  ```

- **Ajouter un cours**
  ```bash
  npm run add-course
  ```

- **Ajouter une note**
  ```bash
  npm run add-grade
  ```

- **Lister tous les étudiants**
  ```bash
  npm run list-students
  ```

- **Lister tous les cours**
  ```bash
  npm run list-courses
  ```

#### Statistiques et analyses

- **Statistiques d'un étudiant**
  ```bash
  npm run stats-student
  ```
  Affiche : moyenne, note min/max, nombre de notes, détail des notes

- **Statistiques d'un cours**
  ```bash
  npm run stats-course
  ```
  Affiche : moyenne de la classe, note min/max, taux de réussite, notes des étudiants

- **Statistiques globales**
  ```bash
  npm run stats-global
  ```
  Affiche : vue d'ensemble, moyennes par cours, moyennes par étudiant

## 📊 Structure des données

### Collection `students`
```javascript
{
  "_id": ObjectId("..."),
  "student_id": "S001",
  "first_name": "Alice",
  "last_name": "Martin"
}
```

### Collection `courses`
```javascript
{
  "_id": ObjectId("..."),
  "course_id": "C001",
  "name": "Base de données",
  "credits": 4
}
```

### Collection `grades`
```javascript
{
  "_id": ObjectId("..."),
  "student_id": "S001",
  "course_id": "C001",
  "grade": 16.5,
  "date": ISODate("2025-01-15")
}
```

## 🔍 Fonctionnalités MongoDB utilisées

### Agrégations

Le projet utilise les pipelines d'agrégation MongoDB pour calculer les statistiques :

- **`$group`** : Grouper les documents et calculer des agrégats
- **`$avg`** : Calculer la moyenne
- **`$min`** / **`$max`** : Trouver les valeurs min/max
- **`$sum`** : Compter les documents
- **`$lookup`** : Joindre des collections (équivalent d'un JOIN SQL)
- **`$match`** : Filtrer les documents
- **`$sort`** : Trier les résultats

### Index

Les index suivants sont créés pour optimiser les performances :
- `students.student_id` (unique)
- `courses.course_id` (unique)
- `grades.student_id`
- `grades.course_id`
- `grades.date`

## 📈 Exemples de requêtes d'agrégation

### Moyenne par étudiant
```javascript
db.grades.aggregate([
  { $match: { student_id: "S001" } },
  {
    $group: {
      _id: null,
      moyenne: { $avg: "$grade" },
      noteMin: { $min: "$grade" },
      noteMax: { $max: "$grade" }
    }
  }
])
```

### Moyenne par cours
```javascript
db.grades.aggregate([
  { $match: { course_id: "C001" } },
  {
    $group: {
      _id: "$course_id",
      moyenne: { $avg: "$grade" },
      nombreEtudiants: { $addToSet: "$student_id" }
    }
  }
])
```

## 🎓 KPIs calculés

- **Moyenne générale** : Moyenne de toutes les notes
- **Moyenne par étudiant** : Performance individuelle
- **Moyenne par cours** : Performance de la classe par matière
- **Taux de réussite** : Pourcentage d'étudiants avec note >= 10/20
- **Note minimale/maximale** : Écarts de performance

## 📁 Structure du projet

```
.
├── config/
│   └── database.js          # Configuration de la connexion MongoDB
├── scripts/
│   ├── init-database.js     # Initialisation avec données d'exemple
│   ├── add-student.js       # Ajouter un étudiant
│   ├── add-course.js        # Ajouter un cours
│   ├── add-grade.js         # Ajouter une note
│   ├── list-students.js     # Lister les étudiants
│   ├── list-courses.js      # Lister les cours
│   ├── stats-student.js     # Statistiques par étudiant
│   ├── stats-course.js      # Statistiques par cours
│   └── stats-global.js      # Statistiques globales
├── package.json
└── README.md
```

## 🔐 Authentification

L'application utilise JWT (JSON Web Tokens) pour l'authentification.

### Utilisateurs par défaut

Après `npm run init-users`, deux utilisateurs sont créés :

- **Admin** : `admin` / `admin123` (droits complets)
- **Enseignant** : `teacher` / `teacher123` (droits limités)

### Créer un nouvel utilisateur

Via l'API :
```bash
POST /api/auth/register
{
  "username": "nouvel_utilisateur",
  "password": "mot_de_passe",
  "role": "teacher" // ou "admin"
}
```

## 📄 Export PDF

L'application permet d'exporter les données en PDF :

- Export global : toutes les statistiques
- Export par étudiant : détails et notes d'un étudiant
- Export par cours : statistiques d'un cours

Utilisez le bouton "📄 PDF" dans l'interface ou l'API :
```
GET /api/export/pdf?type=global
GET /api/export/pdf?type=student&id=S001
GET /api/export/pdf?type=course&id=C001
```

## 🔔 Notifications

Le système de notifications affiche des messages pour :
- Succès des opérations
- Erreurs
- Informations importantes

Les notifications apparaissent en haut à droite de l'écran.

## 🔧 Personnalisation

Vous pouvez facilement étendre le projet en ajoutant :
- Export Excel
- Graphiques avancés
- Notifications par email
- Gestion des sessions d'examen
- Historique des modifications
- Multi-établissements

## 📝 Notes

- Les notes sont sur une échelle de 0 à 20
- Le taux de réussite est calculé avec un seuil de 10/20
- Les dates sont stockées au format ISO
- Les IDs sont uniques (student_id, course_id)

## 🐛 Dépannage

**Erreur de connexion à MongoDB**
- Vérifiez que MongoDB est en cours d'exécution
- Vérifiez l'URI de connexion dans `.env` ou `config/database.js`

**Erreur "ID existe déjà"**
- Les IDs (student_id, course_id) doivent être uniques
- Utilisez un ID différent ou supprimez l'ancien document

## 📚 Ressources

- [Documentation MongoDB](https://docs.mongodb.com/)
- [Guide d'agrégation MongoDB](https://docs.mongodb.com/manual/aggregation/)
- [Node.js MongoDB Driver](https://docs.mongodb.com/drivers/node/)

## 📄 Licence

ISC

---

**Projet réalisé dans le cadre de l'apprentissage de MongoDB et des bases de données NoSQL**
