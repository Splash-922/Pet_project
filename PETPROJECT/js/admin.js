// Fahrzeugdaten laden
async function loadCars() {
    try {
        const response = await fetch('../data/cars.json');
        const cars = await response.json();
        return cars;
    } catch (error) {
        console.log('Konnte cars.json nicht laden, verwende lokale Daten');
        const storedCars = localStorage.getItem('cars');
        return storedCars ? JSON.parse(storedCars) : [];
    }
}

// Fahrzeugdaten speichern
function saveCars(cars) {
    localStorage.setItem('cars', JSON.stringify(cars));
    console.log('Aktualisierte Anzeigen (in cars.json kopieren):', JSON.stringify(cars, null, 2));
}

// Überprüfen, ob der Benutzer ein Admin ist
function checkAdminAccess() {
    const user = JSON.parse(localStorage.getItem('current_user') || '{}');
    if (!user.email || user.email !== 'admin@mail.ru') {
        alert('Zugriff verweigert! Nur für Administratoren.');
        window.location.href = 'auth.html';
        return false;
    }
    document.getElementById('adminName').textContent = user.name;
    return true;
}

// Aktivitätsprotokolle anzeigen
function displayActivityLogs() {
    try {
        const activity = JSON.parse(localStorage.getItem('activities') || '[]');
        const logsDiv = document.getElementById('activityList');
        
        if (activity.length === 0) {
            logsDiv.innerHTML = '<div class="no-data">Keine Aktivitätsprotokolle vorhanden</div>';
            return;
        }

        const recentLogs = activity.slice(-50).reverse();
        let html = '';
        
        recentLogs.forEach(log => {
            const date = new Date(log.timestamp).toLocaleString('de-DE');
            let actionText = '';
            let actionClass = '';
            
            switch(log.action) {
                case 'LOGIN':
                    actionText = 'Anmeldung';
                    actionClass = 'login';
                    break;
                case 'LOGOUT':
                    actionText = 'Abmeldung';
                    actionClass = 'logout';
                    break;
                case 'CAR_ADD':
                    actionText = 'Anzeige hinzugefügt';
                    actionClass = 'car-add';
                    break;
                case 'CAR_DELETE':
                    actionText = 'Anzeige gelöscht (Admin)';
                    actionClass = 'car-delete';
                    break;
                case 'CAR_DELETE_USER':
                    actionText = 'Anzeige gelöscht (Benutzer)';
                    actionClass = 'car-delete-user';
                    break;
                case 'LIKE_TOGGLE':
                    actionText = log.details.action === 'liked' ? 'Like hinzugefügt' : 'Like entfernt';
                    actionClass = 'like';
                    break;
                default:
                    actionText = log.action;
                    actionClass = 'other';
            }
            
            html += `
                <div class="log-item ${actionClass}">
                    <div class="log-header">
                        <strong>${actionText}</strong>
                        <span class="log-time">${date}</span>
                    </div>
                    <div class="log-details">
                        Benutzer: ${log.userEmail}
                        ${log.details.carTitle ? `<br>Anzeige: ${log.details.carTitle}` : ''}
                        ${log.details.carId ? `<br>ID: ${log.details.carId}` : ''}
                    </div>
                </div>
            `;
        });
        
        logsDiv.innerHTML = html;
    } catch (error) {
        document.getElementById('activityList').innerHTML = '<div class="error">Fehler beim Laden der Protokolle</div>';
    }
}

// Anzeigen für Admin anzeigen
async function displayAdminCars() {
    const cars = await loadCars();
    const carsGrid = document.getElementById('adminCarsGrid');
    
    if (cars.length === 0) {
        carsGrid.innerHTML = '<div class="no-data">Keine Anzeigen vorhanden</div>';
        return;
    }
    
    const likes = JSON.parse(localStorage.getItem('car_likes') || '{}');
    
    carsGrid.innerHTML = cars.map(car => `
        <div class="admin-car-card">
            <div class="car-image">
                ${car.images && car.images.length > 0 ? 
                    `<img src="${car.images[0]}" alt="${car.title}" style="width: 100%; height: 150px; object-fit: cover;">` : 
                    '<div class="no-image">Kein Foto vorhanden</div>'
                }
                ${likes[car.id] ? `<div class="like-count">❤️ ${likes[car.id]}</div>` : ''}
            </div>
            <div class="car-info">
                <div class="car-title">${car.title}</div>
                <div class="car-price">${car.price.toLocaleString()} ${car.currency || 'EUR'}</div>
                <div class="car-details">
                    <div>Autor: ${car.authorName}</div>
                    <div>Erstellt: ${new Date(car.createdAt).toLocaleDateString()}</div>
                </div>
                <button class="delete-btn" onclick="deleteCarAdmin(${car.id})">Löschen</button>
            </div>
        </div>
    `).join('');
}

// Anzeige als Admin löschen
async function deleteCarAdmin(carId) {
    if (!confirm('Sind Sie sicher, dass Sie diese Anzeige löschen möchten?')) {
        return;
    }
    
    try {
        const cars = await loadCars();
        const updatedCars = cars.filter(car => car.id !== carId);
        await saveCars(updatedCars);
        
        // Aktion protokollieren
        const user = JSON.parse(localStorage.getItem('current_user') || '{}');
        logActivity('CAR_DELETE', user.email, { carId });
        
        // Anzeige aktualisieren
        displayAdminCars();
        alert('Anzeige erfolgreich gelöscht');
    } catch (error) {
        console.error('Fehler beim Löschen der Anzeige:', error);
        alert('Beim Löschen der Anzeige ist ein Fehler aufgetreten');
    }
}

// Zwischen den Bereichen wechseln
function showSection(sectionName) {
    // Alle Bereiche ausblenden
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Ausgewählten Bereich anzeigen
    document.getElementById(sectionName + 'Section').style.display = 'block';
    
    // Aktive Schaltfläche aktualisieren
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('show' + sectionName.charAt(0).toUpperCase() + sectionName.slice(1) + 'Btn').classList.add('active');
}

// Abmelden
function logout() {
    const user = JSON.parse(localStorage.getItem('current_user') || '{}');
    if (user.email) {
        logActivity('LOGOUT', user.email);
    }
    localStorage.removeItem('current_user');
    window.location.href = 'auth.html';
}

// Aktivität protokollieren
function logActivity(action, userEmail, details = {}) {
    try {
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        activities.push({
            action,
            userEmail,
            timestamp: new Date().toISOString(),
            details
        });
        localStorage.setItem('activities', JSON.stringify(activities));
    } catch (error) {
        console.error('Fehler beim Protokollieren:', error);
    }
}

// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    if (checkAdminAccess()) {
        displayActivityLogs();
        
        // Ereignisbehandler für Schaltflächen
        document.getElementById('showLogsBtn').addEventListener('click', () => showSection('logs'));
        document.getElementById('showCarsBtn').addEventListener('click', () => showSection('cars'));
        document.getElementById('logoutBtn').addEventListener('click', logout);
    }
});
