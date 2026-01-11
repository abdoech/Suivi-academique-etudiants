// Variables globales
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// Système de notifications
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notifications-container');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Vérifier l'authentification au chargement
async function checkAuth() {
    if (!authToken) {
        showLoginModal();
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            localStorage.removeItem('authToken');
            authToken = null;
            showLoginModal();
            return false;
        }
        
        const data = await response.json();
        currentUser = data.user;
        document.getElementById('user-info').textContent = `👤 ${currentUser.username} (${currentUser.role})`;
        document.getElementById('main-container').style.display = 'block';
        return true;
    } catch (error) {
        localStorage.removeItem('authToken');
        authToken = null;
        showLoginModal();
        return false;
    }
}

// Afficher le modal de connexion
function showLoginModal() {
    document.getElementById('login-modal').style.display = 'block';
    document.getElementById('main-container').style.display = 'none';
}

// Connexion
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        console.log('🔐 Tentative de connexion:', username);
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        console.log('📡 Réponse reçue - Status:', response.status, 'OK:', response.ok);
        
        const data = await response.json();
        console.log('📊 Données reçues:', data);
        
        if (!response.ok) {
            throw new Error(data.error || `Erreur HTTP: ${response.status}`);
        }
        
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            document.getElementById('login-modal').style.display = 'none';
            document.getElementById('main-container').style.display = 'block';
            document.getElementById('user-info').textContent = `👤 ${currentUser.username} (${currentUser.role})`;
            showNotification('Connexion réussie!', 'success');
            loadDashboard();
        } else {
            showNotification(data.error || 'Erreur de connexion', 'error');
        }
    } catch (error) {
        console.error('❌ Erreur de connexion:', error);
        showNotification(error.message || 'Erreur de connexion au serveur', 'error');
    }
});

// Déconnexion
function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    showLoginModal();
    showNotification('Déconnexion réussie', 'info');
}

// Export PDF
async function exportPDF() {
    if (!authToken) {
        showNotification('Vous devez être connecté', 'error');
        return;
    }
    
    const type = prompt('Type d\'export (student/course/global):', 'global');
    const id = type !== 'global' ? prompt('ID:') : null;
    
    if (!type) return;
    
    try {
        const url = `/api/export/pdf?type=${type}${id ? `&id=${id}` : ''}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `export_${type}_${id || 'global'}.pdf`;
            link.click();
            showNotification('PDF généré avec succès!', 'success');
        } else {
            showNotification('Erreur lors de la génération du PDF', 'error');
        }
    } catch (error) {
        showNotification('Erreur: ' + error.message, 'error');
    }
}

// Gestion des onglets
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Désactiver tous les onglets
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Activer l'onglet sélectionné
        btn.classList.add('active');
        document.getElementById(tab).classList.add('active');
        
        // Charger les données si nécessaire
        if (tab === 'dashboard') loadDashboard();
        if (tab === 'students') loadStudents();
        if (tab === 'courses') loadCourses();
    });
});

// Modal
const modal = document.getElementById('modal');
const closeBtn = document.querySelector('.close');

closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
};

// Fonctions API avec authentification
async function fetchAPI(endpoint) {
    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        const response = await fetch(`/api/${endpoint}`, { headers });
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                throw new Error('Session expirée');
            }
            throw new Error('Erreur API');
        }
        return await response.json();
    } catch (error) {
        console.error('Erreur:', error);
        return null;
    }
}

async function postAPI(endpoint, data) {
    try {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            return { error: result.error || 'Erreur serveur' };
        }
        return result;
    } catch (error) {
        console.error('Erreur:', error);
        return { error: error.message || 'Erreur de connexion' };
    }
}

// Variables pour les graphiques
let courseChart = null;
let studentChart = null;

// Charger le tableau de bord
async function loadDashboard() {
    const data = await fetchAPI('stats/global');
    if (!data) return;

    // Statistiques principales avec animation
    if (data.overview) {
        animateValue('stat-students', 0, data.overview.nbStudents, 1000);
        animateValue('stat-courses', 0, data.overview.nbCourses, 1000);
        animateValue('stat-grades', 0, data.overview.nbGrades, 1000);
    }
    if (data.globalStats) {
        const avg = parseFloat(data.globalStats.moyenneGenerale);
        animateAverage('stat-average', 0, avg, 1000);
    }

    // Graphique des moyennes par cours
    if (data.moyenneParCours && data.moyenneParCours.length > 0) {
        const ctx1 = document.getElementById('courseChart');
        if (courseChart) courseChart.destroy();
        
        courseChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: data.moyenneParCours.map(c => c.nomCours),
                datasets: [{
                    label: 'Moyenne',
                    data: data.moyenneParCours.map(c => c.moyenne),
                    backgroundColor: data.moyenneParCours.map(c => 
                        c.moyenne >= 10 ? 'rgba(67, 233, 123, 0.8)' : 'rgba(102, 126, 234, 0.8)'
                    ),
                    borderColor: data.moyenneParCours.map(c => 
                        c.moyenne >= 10 ? 'rgba(67, 233, 123, 1)' : 'rgba(102, 126, 234, 1)'
                    ),
                    borderWidth: 2,
                    borderRadius: 10,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 20,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '/20';
                            },
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }

    // Graphique top 5 étudiants
    if (data.moyenneParEtudiant && data.moyenneParEtudiant.length > 0) {
        const top5 = data.moyenneParEtudiant.slice(0, 5);
        const ctx2 = document.getElementById('studentChart');
        if (studentChart) studentChart.destroy();
        
        studentChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: top5.map(s => s.nom.split(' ')[0]),
                datasets: [{
                    label: 'Moyenne',
                    data: top5.map(s => s.moyenne),
                    borderColor: 'rgba(118, 75, 162, 1)',
                    backgroundColor: 'rgba(118, 75, 162, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.5,
                    pointRadius: 7,
                    pointHoverRadius: 9,
                    pointBackgroundColor: 'rgba(118, 75, 162, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: 'rgba(118, 75, 162, 1)',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 20,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '/20';
                            },
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }

    // Moyennes par cours
    const courseHTML = data.moyenneParCours.map(c => `
        <div class="stat-item">
            <span>${c.nomCours}</span>
            <strong>${c.moyenne.toFixed(2)}/20</strong>
        </div>
    `).join('');
    document.getElementById('course-averages').innerHTML = courseHTML || '<p>Aucune donnée</p>';

    // Moyennes par étudiant avec indicateurs visuels
    const studentHTML = data.moyenneParEtudiant.map(s => {
        const status = s.moyenne >= 10 ? '✅' : '⚠️';
        const statusClass = s.moyenne >= 10 ? 'passed' : 'failed';
        return `
        <div class="stat-item ${statusClass}">
            <span>${status} ${s.nom} <span style="color: #999; font-size: 0.9em;">(${s._id})</span></span>
            <strong>${s.moyenne.toFixed(2)}/20</strong>
        </div>
    `;
    }).join('');
    document.getElementById('student-averages').innerHTML = studentHTML || '<p>Aucune donnée</p>';

    // Calculer les indicateurs de performance
    if (data.globalStats && data.moyenneParEtudiant) {
        // Taux de réussite (>= 10/20)
        const reussis = data.moyenneParEtudiant.filter(s => s.moyenne >= 10).length;
        const total = data.moyenneParEtudiant.length;
        const tauxReussite = total > 0 ? ((reussis / total) * 100).toFixed(1) : 0;
        document.getElementById('success-rate').textContent = `${tauxReussite}%`;

        // Étudiants en difficulté (< 10/20)
        const enDifficulte = data.moyenneParEtudiant.filter(s => s.moyenne < 10).length;
        document.getElementById('struggling-students').textContent = enDifficulte;
    }
}

// Fonction pour animer les valeurs numériques
function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(start + (end - start) * progress);
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = end;
        }
    }
    
    requestAnimationFrame(update);
}

// Fonction pour animer la moyenne
function animateAverage(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = start + (end - start) * progress;
        element.textContent = `${current.toFixed(2)}/20`;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = `${end.toFixed(2)}/20`;
        }
    }
    
    requestAnimationFrame(update);
}

// Charger les étudiants
async function loadStudents() {
    const students = await fetchAPI('students');
    if (!students) return;

    // Obtenir les statistiques pour chaque étudiant
    const studentsWithStats = await Promise.all(students.map(async s => {
        const stats = await fetchAPI(`students/${s.student_id}/stats`);
        return { ...s, stats: stats?.stats };
    }));

    // Filtrer par moyenne si nécessaire
    const minAvg = parseFloat(document.getElementById('filter-student-min')?.value) || 0;
    const maxAvg = parseFloat(document.getElementById('filter-student-max')?.value) || 20;
    
    let filtered = studentsWithStats.filter(s => {
        if (!s.stats) return true;
        return s.stats.moyenne >= minAvg && s.stats.moyenne <= maxAvg;
    });

    // Trier
    const sortBy = document.getElementById('student-sort')?.value || 'name';
    if (sortBy === 'name') {
        filtered.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
    } else {
        filtered.sort((a, b) => a.student_id.localeCompare(b.student_id));
    }

    const container = document.getElementById('students-list');
    container.innerHTML = filtered.map(s => {
        const avg = s.stats ? s.stats.moyenne.toFixed(2) : 'N/A';
        return `
        <div class="card">
            <div onclick="showStudentDetails('${s.student_id}')" style="cursor: pointer;">
                <h3>${s.first_name} ${s.last_name}</h3>
                <p><strong>ID:</strong> ${s.student_id}</p>
                ${s.stats ? `<p><strong>Moyenne:</strong> ${avg}/20</p>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn-edit" onclick="event.stopPropagation(); editStudent('${s.student_id}', '${s.first_name}', '${s.last_name}')">✏️ Modifier</button>
                <button class="btn-delete" onclick="event.stopPropagation(); deleteStudent('${s.student_id}')">🗑️ Supprimer</button>
            </div>
        </div>
    `;
    }).join('');

    // Recherche (réinitialiser l'événement)
    const searchInput = document.getElementById('student-search');
    searchInput.replaceWith(searchInput.cloneNode(true));
    document.getElementById('student-search').addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        document.querySelectorAll('#students-list .card').forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(search) ? 'block' : 'none';
        });
    });
}

// Charger les cours
async function loadCourses() {
    const courses = await fetchAPI('courses');
    if (!courses) return;

    // Obtenir les statistiques pour chaque cours
    const coursesWithStats = await Promise.all(courses.map(async c => {
        const stats = await fetchAPI(`courses/${c.course_id}/stats`);
        return { ...c, stats: stats?.stats };
    }));

    // Filtrer par crédits si nécessaire
    const minCredits = parseInt(document.getElementById('filter-course-credits')?.value) || 0;
    let filtered = coursesWithStats.filter(c => c.credits >= minCredits);

    // Trier
    const sortBy = document.getElementById('course-sort')?.value || 'name';
    if (sortBy === 'name') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        filtered.sort((a, b) => b.credits - a.credits);
    }

    const container = document.getElementById('courses-list');
    container.innerHTML = filtered.map(c => {
        const avg = c.stats ? c.stats.moyenne.toFixed(2) : 'N/A';
        return `
        <div class="card">
            <div onclick="showCourseDetails('${c.course_id}')" style="cursor: pointer;">
                <h3>${c.name}</h3>
                <p><strong>ID:</strong> ${c.course_id}</p>
                <p><strong>Crédits:</strong> ${c.credits}</p>
                ${c.stats ? `<p><strong>Moyenne classe:</strong> ${avg}/20</p>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn-edit" onclick="event.stopPropagation(); editCourse('${c.course_id}', '${c.name}', '${c.credits}')">✏️ Modifier</button>
                <button class="btn-delete" onclick="event.stopPropagation(); deleteCourse('${c.course_id}')">🗑️ Supprimer</button>
            </div>
        </div>
    `;
    }).join('');

    // Recherche (réinitialiser l'événement)
    const searchInput = document.getElementById('course-search');
    searchInput.replaceWith(searchInput.cloneNode(true));
    document.getElementById('course-search').addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        document.querySelectorAll('#courses-list .card').forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(search) ? 'block' : 'none';
        });
    });
}

// Afficher les détails d'un étudiant
async function showStudentDetails(studentId) {
    const [studentData, grades] = await Promise.all([
        fetchAPI(`students/${studentId}/stats`),
        fetchAPI(`students/${studentId}/grades`)
    ]);

    if (!studentData) return;

    const { student, stats } = studentData;
    let html = `<h2>👤 ${student.first_name} ${student.last_name} (${student.student_id})</h2>`;

    if (stats) {
        html += `
            <div class="stats-grid" style="margin: 20px 0;">
                <div class="stat-card">
                    <h3>Statistiques</h3>
                    <div class="stat-item">
                        <span>📊 Moyenne</span>
                        <strong>${stats.moyenne.toFixed(2)}/20</strong>
                    </div>
                    <div class="stat-item">
                        <span>⬇️ Note minimale</span>
                        <strong>${stats.noteMin}/20</strong>
                    </div>
                    <div class="stat-item">
                        <span>⬆️ Note maximale</span>
                        <strong>${stats.noteMax}/20</strong>
                    </div>
                    <div class="stat-item">
                        <span>📝 Nombre de notes</span>
                        <strong>${stats.nombreNotes}</strong>
                    </div>
                </div>
            </div>
            <h3>📝 Notes détaillées</h3>
        `;

        if (grades && grades.length > 0) {
            html += grades.map(g => {
                const date = new Date(g.date).toLocaleDateString('fr-FR');
                const status = g.grade >= 10 ? 'passed' : 'failed';
                return `
                    <div class="grade-item ${status}">
                        <span><strong>${g.course.name}</strong> - ${date}</span>
                        <div>
                            <strong>${g.grade}/20</strong>
                            <button class="btn-edit-small" onclick="editGrade('${g._id}', '${g.student_id}', '${g.course_id}', ${g.grade}, '${g.date}')">✏️</button>
                            <button class="btn-delete-small" onclick="deleteGrade('${g._id}')">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            html += '<p>Aucune note enregistrée</p>';
        }
    } else {
        html += '<p>Aucune statistique disponible</p>';
    }

    html += `
        <div style="margin-top: 20px; display: flex; gap: 10px;">
            <button class="btn-edit" onclick="editStudent('${student.student_id}', '${student.first_name}', '${student.last_name}')">✏️ Modifier l'étudiant</button>
            <button class="btn-delete" onclick="deleteStudent('${student.student_id}')">🗑️ Supprimer l'étudiant</button>
        </div>
    `;

    document.getElementById('modal-body').innerHTML = html;
    modal.style.display = 'block';
}

// Afficher les détails d'un cours
async function showCourseDetails(courseId) {
    const [courseData, grades] = await Promise.all([
        fetchAPI(`courses/${courseId}/stats`),
        fetchAPI(`courses/${courseId}/grades`)
    ]);

    if (!courseData) return;

    const { course, stats } = courseData;
    let html = `<h2>📚 ${course.name} (${course.course_id})</h2>`;
    html += `<p><strong>Crédits:</strong> ${course.credits}</p>`;

    if (stats) {
        const tauxReussite = grades ? (grades.filter(g => g.grade >= 10).length / stats.nombreNotes * 100).toFixed(1) : 0;
        html += `
            <div class="stats-grid" style="margin: 20px 0;">
                <div class="stat-card">
                    <h3>Statistiques</h3>
                    <div class="stat-item">
                        <span>📊 Moyenne de la classe</span>
                        <strong>${stats.moyenne.toFixed(2)}/20</strong>
                    </div>
                    <div class="stat-item">
                        <span>⬇️ Note minimale</span>
                        <strong>${stats.noteMin}/20</strong>
                    </div>
                    <div class="stat-item">
                        <span>⬆️ Note maximale</span>
                        <strong>${stats.noteMax}/20</strong>
                    </div>
                    <div class="stat-item">
                        <span>👥 Nombre d'étudiants</span>
                        <strong>${stats.nombreEtudiants}</strong>
                    </div>
                    <div class="stat-item">
                        <span>✅ Taux de réussite</span>
                        <strong>${tauxReussite}%</strong>
                    </div>
                </div>
            </div>
            <h3>📝 Notes des étudiants</h3>
        `;

        if (grades && grades.length > 0) {
            html += grades.map(g => {
                const date = new Date(g.date).toLocaleDateString('fr-FR');
                const status = g.grade >= 10 ? 'passed' : 'failed';
                return `
                    <div class="grade-item ${status}">
                        <span><strong>${g.student.first_name} ${g.student.last_name}</strong> (${g.student.student_id}) - ${date}</span>
                        <div>
                            <strong>${g.grade}/20</strong>
                            <button class="btn-edit-small" onclick="editGrade('${g._id}', '${g.student_id}', '${g.course_id}', ${g.grade}, '${g.date}')">✏️</button>
                            <button class="btn-delete-small" onclick="deleteGrade('${g._id}')">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            html += '<p>Aucune note enregistrée</p>';
        }
    } else {
        html += '<p>Aucune statistique disponible</p>';
    }

    html += `
        <div style="margin-top: 20px; display: flex; gap: 10px;">
            <button class="btn-edit" onclick="editCourse('${course.course_id}', '${course.name}', '${course.credits}')">✏️ Modifier le cours</button>
            <button class="btn-delete" onclick="deleteCourse('${course.course_id}')">🗑️ Supprimer le cours</button>
        </div>
    `;

    document.getElementById('modal-body').innerHTML = html;
    modal.style.display = 'block';
}

// Formulaires
document.getElementById('add-student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        student_id: document.getElementById('student-id').value.trim(),
        first_name: document.getElementById('student-firstname').value.trim(),
        last_name: document.getElementById('student-lastname').value.trim()
    };
    
    if (!data.student_id || !data.first_name || !data.last_name) {
        showMessage('error', 'Veuillez remplir tous les champs');
        return;
    }
    
    try {
        const result = await postAPI('students', data);
        if (result.success) {
            showMessage('success', 'Étudiant ajouté avec succès!');
            e.target.reset();
            loadStudents();
            loadDashboard();
            loadSelects();
        } else {
            showMessage('error', result.error || 'Erreur lors de l\'ajout');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('error', 'Erreur de connexion au serveur');
    }
});

document.getElementById('add-course-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        course_id: document.getElementById('course-id').value.trim(),
        name: document.getElementById('course-name').value.trim(),
        credits: document.getElementById('course-credits').value
    };
    
    if (!data.course_id || !data.name || !data.credits) {
        showMessage('error', 'Veuillez remplir tous les champs');
        return;
    }
    
    if (isNaN(data.credits) || parseInt(data.credits) <= 0) {
        showMessage('error', 'Le nombre de crédits doit être un nombre positif');
        return;
    }
    
    try {
        const result = await postAPI('courses', data);
        if (result.success) {
            showMessage('success', 'Cours ajouté avec succès!');
            e.target.reset();
            loadCourses();
            loadSelects();
            loadDashboard();
        } else {
            showMessage('error', result.error || 'Erreur lors de l\'ajout');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('error', 'Erreur de connexion au serveur');
    }
});

document.getElementById('add-grade-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('grade-date').value || new Date().toISOString().split('T')[0];
    const data = {
        student_id: document.getElementById('grade-student').value,
        course_id: document.getElementById('grade-course').value,
        grade: document.getElementById('grade-value').value,
        date: date
    };
    
    if (!data.student_id || !data.course_id || !data.grade) {
        showMessage('error', 'Veuillez remplir tous les champs');
        return;
    }
    
    const gradeNum = parseFloat(data.grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 20) {
        showMessage('error', 'La note doit être entre 0 et 20');
        return;
    }
    
    try {
        const result = await postAPI('grades', data);
        if (result.success) {
            showMessage('success', 'Note ajoutée avec succès!');
            e.target.reset();
            loadDashboard();
        } else {
            showMessage('error', result.error || 'Erreur lors de l\'ajout');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('error', 'Erreur de connexion au serveur');
    }
});

// Charger les selects pour les notes
async function loadSelects() {
    const [students, courses] = await Promise.all([
        fetchAPI('students'),
        fetchAPI('courses')
    ]);

    const studentSelect = document.getElementById('grade-student');
    const courseSelect = document.getElementById('grade-course');

    studentSelect.innerHTML = '<option value="">Sélectionner un étudiant</option>' +
        students.map(s => `<option value="${s.student_id}">${s.first_name} ${s.last_name} (${s.student_id})</option>`).join('');

    courseSelect.innerHTML = '<option value="">Sélectionner un cours</option>' +
        courses.map(c => `<option value="${c.course_id}">${c.name} (${c.course_id})</option>`).join('');
}

function showMessage(type, message) {
    // Utiliser le système de notifications
    showNotification(message, type === 'success' ? 'success' : 'error');
    
    // Aussi afficher dans le formulaire si nécessaire
    const targetSection = document.querySelector('#add');
    if (targetSection) {
        const div = document.createElement('div');
        div.className = type === 'success' ? 'success-message' : 'error-message';
        div.textContent = message;
        const h2 = targetSection.querySelector('h2');
        if (h2) {
            h2.after(div);
            setTimeout(() => div.remove(), 5000);
        }
    }
}

// Initialisation
checkAuth().then(authenticated => {
    if (authenticated) {
        loadDashboard();
        loadSelects();
    }
});

// Exposer les fonctions globalement
window.logout = logout;
window.exportPDF = exportPDF;

// Fonctions pour modifier et supprimer
async function editStudent(studentId, firstName, lastName) {
    const newFirstName = prompt('Nouveau prénom:', firstName);
    if (newFirstName === null || !newFirstName.trim()) return;
    
    const newLastName = prompt('Nouveau nom:', lastName);
    if (newLastName === null || !newLastName.trim()) return;

    try {
        const response = await fetch(`/api/students/${studentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: newFirstName.trim(), last_name: newLastName.trim() })
        });
        const result = await response.json();
        
        if (result.success) {
            showMessage('success', 'Étudiant modifié avec succès!');
            loadStudents();
            loadDashboard();
            if (modal) modal.style.display = 'none';
        } else {
            showMessage('error', result.error || 'Erreur lors de la modification');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('error', 'Erreur de connexion au serveur');
    }
}

async function deleteStudent(studentId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet étudiant ? Toutes ses notes seront également supprimées.')) {
        return;
    }

    try {
        console.log('=== DÉBUT SUPPRESSION ÉTUDIANT ===');
        console.log('ID étudiant:', studentId);
        console.log('Type:', typeof studentId);
        
        const url = `/api/students/${encodeURIComponent(studentId)}`;
        console.log('URL complète:', window.location.origin + url);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('Réponse reçue:');
        console.log('  - Status:', response.status);
        console.log('  - Status Text:', response.statusText);
        console.log('  - OK:', response.ok);
        console.log('  - Headers:', Object.fromEntries(response.headers.entries()));
        
        // Lire le contenu de la réponse
        const responseText = await response.text();
        console.log('  - Body (texte):', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('  - Body (JSON):', result);
        } catch (parseError) {
            console.error('  - Erreur parsing JSON:', parseError);
            console.error('  - Contenu reçu (non-JSON):', responseText.substring(0, 200));
            throw new Error(`Le serveur a renvoyé du HTML au lieu de JSON. Status: ${response.status}. Vérifiez que le serveur est bien démarré.`);
        }
        
        if (!response.ok) {
            throw new Error(result.error || `Erreur HTTP: ${response.status} - ${response.statusText}`);
        }

        if (result.success) {
            console.log('✅ Suppression réussie!');
            showMessage('success', 'Étudiant supprimé avec succès!');
            loadStudents();
            loadDashboard();
            loadSelects();
            if (modal) modal.style.display = 'none';
        } else {
            console.error('❌ Suppression échouée:', result);
            showMessage('error', result.error || 'Erreur lors de la suppression');
        }
        
        console.log('=== FIN SUPPRESSION ÉTUDIANT ===');
    } catch (error) {
        console.error('=== ERREUR SUPPRESSION ÉTUDIANT ===');
        console.error('Type d\'erreur:', error.constructor.name);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('Erreur complète:', error);
        console.error('=== FIN ERREUR ===');
        
        showMessage('error', `Erreur: ${error.message || 'Erreur de connexion au serveur'}`);
    }
}

async function editCourse(courseId, name, credits) {
    const newName = prompt('Nouveau nom du cours:', name);
    if (newName === null || !newName.trim()) return;
    
    const newCredits = prompt('Nouveau nombre de crédits:', credits);
    if (newCredits === null || !newCredits.trim()) return;
    
    const creditsNum = parseInt(newCredits);
    if (isNaN(creditsNum) || creditsNum <= 0) {
        showMessage('error', 'Le nombre de crédits doit être un nombre positif');
        return;
    }

    try {
        const response = await fetch(`/api/courses/${courseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim(), credits: creditsNum })
        });
        const result = await response.json();

        if (result.success) {
            showMessage('success', 'Cours modifié avec succès!');
            loadCourses();
            loadDashboard();
            loadSelects();
            if (modal) modal.style.display = 'none';
        } else {
            showMessage('error', result.error || 'Erreur lors de la modification');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('error', 'Erreur de connexion au serveur');
    }
}

async function deleteCourse(courseId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cours ? Toutes les notes associées seront également supprimées.')) {
        return;
    }

    try {
        console.log('=== DÉBUT SUPPRESSION COURS ===');
        console.log('ID cours:', courseId);
        const url = `/api/courses/${encodeURIComponent(courseId)}`;
        console.log('URL complète:', window.location.origin + url);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('Réponse - Status:', response.status, 'OK:', response.ok);
        const responseText = await response.text();
        console.log('Réponse body:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`Le serveur a renvoyé du HTML. Status: ${response.status}`);
        }
        
        if (!response.ok) {
            throw new Error(result.error || `Erreur HTTP: ${response.status}`);
        }

        if (result.success) {
            showMessage('success', 'Cours supprimé avec succès!');
            loadCourses();
            loadDashboard();
            loadSelects();
            if (modal) modal.style.display = 'none';
        } else {
            showMessage('error', result.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('=== ERREUR SUPPRESSION COURS ===');
        console.error('Erreur complète:', error);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        showMessage('error', `Erreur: ${error.message || 'Erreur de connexion au serveur'}`);
    }
}

async function editGrade(gradeId, studentId, courseId, grade, date) {
    const newGrade = prompt('Nouvelle note (0-20):', grade);
    if (newGrade === null || isNaN(newGrade) || newGrade < 0 || newGrade > 20) {
        if (newGrade !== null) showMessage('error', 'La note doit être entre 0 et 20');
        return;
    }

    const dateStr = date.split('T')[0];
    const newDate = prompt('Nouvelle date (YYYY-MM-DD):', dateStr) || dateStr;

    const result = await fetch(`/api/grades/${gradeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            student_id: studentId, 
            course_id: courseId, 
            grade: parseFloat(newGrade),
            date: newDate
        })
    }).then(r => r.json());

    if (result.success) {
        showMessage('success', 'Note modifiée avec succès!');
        const currentTab = document.querySelector('.tab-content.active').id;
        if (currentTab === 'dashboard') loadDashboard();
        modal.style.display = 'none';
        // Recharger les détails si une modale est ouverte
        const modalTitle = document.querySelector('#modal-body h2');
        if (modalTitle) {
            if (modalTitle.textContent.includes('👤')) {
                const studentId = modalTitle.textContent.match(/\(([^)]+)\)/)?.[1];
                if (studentId) showStudentDetails(studentId);
            } else if (modalTitle.textContent.includes('📚')) {
                const courseId = modalTitle.textContent.match(/\(([^)]+)\)/)?.[1];
                if (courseId) showCourseDetails(courseId);
            }
        }
    } else {
        showMessage('error', result.error || 'Erreur lors de la modification');
    }
}

async function deleteGrade(gradeId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
        return;
    }

    try {
        console.log('=== DÉBUT SUPPRESSION NOTE ===');
        console.log('ID note:', gradeId);
        const url = `/api/grades/${encodeURIComponent(gradeId)}`;
        console.log('URL complète:', window.location.origin + url);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('Réponse - Status:', response.status, 'OK:', response.ok);
        const responseText = await response.text();
        console.log('Réponse body:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`Le serveur a renvoyé du HTML. Status: ${response.status}`);
        }
        
        if (!response.ok) {
            throw new Error(result.error || `Erreur HTTP: ${response.status}`);
        }

        if (result.success) {
            showMessage('success', 'Note supprimée avec succès!');
            const currentTab = document.querySelector('.tab-content.active').id;
            if (currentTab === 'dashboard') loadDashboard();
            if (modal) modal.style.display = 'none';
            // Recharger les détails si une modale est ouverte
            const modalTitle = document.querySelector('#modal-body h2');
            if (modalTitle) {
                if (modalTitle.textContent.includes('👤')) {
                    const studentId = modalTitle.textContent.match(/\(([^)]+)\)/)?.[1];
                    if (studentId) showStudentDetails(studentId);
                } else if (modalTitle.textContent.includes('📚')) {
                    const courseId = modalTitle.textContent.match(/\(([^)]+)\)/)?.[1];
                    if (courseId) showCourseDetails(courseId);
                }
            }
        } else {
            showMessage('error', result.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('=== ERREUR SUPPRESSION NOTE ===');
        console.error('Erreur complète:', error);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        showMessage('error', `Erreur: ${error.message || 'Erreur de connexion au serveur'}`);
    }
}

// Fonctions utilitaires
function toggleFilter(type) {
    const panel = document.getElementById(`${type}-filters`);
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'grid' : 'none';
    }
}

async function refreshData() {
    const currentTab = document.querySelector('.tab-content.active').id;
    showMessage('success', 'Données actualisées!');
    
    if (currentTab === 'dashboard') {
        loadDashboard();
    } else if (currentTab === 'students') {
        loadStudents();
    } else if (currentTab === 'courses') {
        loadCourses();
    }
}

async function exportData() {
    try {
        const [students, courses, stats] = await Promise.all([
            fetchAPI('students'),
            fetchAPI('courses'),
            fetchAPI('stats/global')
        ]);

        // Créer le CSV
        let csv = 'Type,ID,Nom,Données\n';
        
        // Étudiants
        if (students) {
            for (const s of students) {
                const studentStats = await fetchAPI(`students/${s.student_id}/stats`);
                const avg = studentStats?.stats?.moyenne?.toFixed(2) || 'N/A';
                csv += `Étudiant,${s.student_id},"${s.first_name} ${s.last_name}",Moyenne: ${avg}/20\n`;
            }
        }

        // Cours
        if (courses) {
            for (const c of courses) {
                const courseStats = await fetchAPI(`courses/${c.course_id}/stats`);
                const avg = courseStats?.stats?.moyenne?.toFixed(2) || 'N/A';
                csv += `Cours,${c.course_id},"${c.name}",Moyenne: ${avg}/20, Crédits: ${c.credits}\n`;
            }
        }

        // Statistiques globales
        if (stats?.globalStats) {
            csv += `\nStatistiques Globales\n`;
            csv += `Moyenne générale,${stats.globalStats.moyenneGenerale.toFixed(2)}/20\n`;
            csv += `Note minimale,${stats.globalStats.noteMin}/20\n`;
            csv += `Note maximale,${stats.globalStats.noteMax}/20\n`;
        }

        // Télécharger
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `export_academique_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('success', 'Données exportées avec succès!');
    } catch (error) {
        showMessage('error', 'Erreur lors de l\'export: ' + error.message);
    }
}

// Exposer les fonctions globalement
window.showStudentDetails = showStudentDetails;
window.showCourseDetails = showCourseDetails;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.editGrade = editGrade;
window.deleteGrade = deleteGrade;
window.toggleFilter = toggleFilter;
window.refreshData = refreshData;
window.exportData = exportData;
