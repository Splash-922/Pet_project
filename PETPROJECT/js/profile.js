// Fahrzeugdaten laden
async function loadCars() {
    try {
        // Zuerst versuchen wir, aus dem localStorage zu laden
        const storedCars = localStorage.getItem('cars');
        if (storedCars) {
            console.log('Fahrzeuge aus dem localStorage geladen:', JSON.parse(storedCars));
            return JSON.parse(storedCars);
        }
        
        // Wenn nichts im localStorage ist, versuchen wir die Datei zu laden
        try {
            const response = await fetch('../data/cars.json');
            if (response.ok) {
                const cars = await response.json();
                console.log('Fahrzeuge aus der Datei cars.json geladen');
                return cars;
            }
            throw new Error('Konnte die Datei cars.json nicht laden');
        } catch (error) {
            console.log('Konnte cars.json nicht laden, verwende leeres Array');
            return [];
        }
    } catch (error) {
        console.error('Fehler beim Laden der Fahrzeuge:', error);
        return [];
    }
}

// Fahrzeugdaten speichern
function saveCars(cars) {
    localStorage.setItem('cars', JSON.stringify(cars));
    console.log('Aktualisierte Anzeigen (in cars.json kopieren):', JSON.stringify(cars, null, 2));
}

// Aktuellen Benutzer abrufen
function getCurrentUser() {
    const user = localStorage.getItem('current_user');
    return user ? JSON.parse(user) : null;
}

// Admin-Überprüfung
function isAdmin() {
    const user = getCurrentUser();
    return user && user.email === 'admin@mail.ru';
}

// Preis mit Währung formatieren
function formatPrice(price, currency) {
    const formattedPrice = price.toLocaleString();
    
    const currencySymbols = {
        'RUB': '₽',
        'EUR': '€', 
        'USD': '$',
        'GBP': '£',
        'CHF': '₣',
        'JPY': '¥',
        'CNY': '¥',
        'KRW': '₩',
        'CAD': 'C$',
        'AUD': 'A$',
        'BRL': 'R$',
        'INR': '₹',
        'TRY': '₺',
        'PLN': 'zł',
        'CZK': 'Kč',
        'SEK': 'kr',
        'NOK': 'kr',
        'DKK': 'kr'
    };
    
    const symbol = currencySymbols[currency] || '₽';
    
    const postfixCurrencies = ['PLN', 'CZK', 'SEK', 'NOK', 'DKK'];
    
    if (postfixCurrencies.includes(currency)) {
        return `${formattedPrice} ${symbol}`;
    } else {
        return `${formattedPrice} ${symbol}`;
    }
}

// Like-System
function getLikes() {
    const likes = localStorage.getItem('car_likes');
    return likes ? JSON.parse(likes) : {};
}

function saveLikes(likes) {
    localStorage.setItem('car_likes', JSON.stringify(likes));
}

function getUserLikes() {
    const user = getCurrentUser();
    if (!user) return [];
    
    const userLikes = localStorage.getItem(`user_likes_${user.email}`);
    return userLikes ? JSON.parse(userLikes) : [];
}

function saveUserLikes(likedCarIds) {
    const user = getCurrentUser();
    if (!user) return;
    
    localStorage.setItem(`user_likes_${user.email}`, JSON.stringify(likedCarIds));
}

function toggleLike(carId) {
    const user = getCurrentUser();
    if (!user) return;
    
    const likes = getLikes();
    const userLikes = getUserLikes();
    
    if (userLikes.includes(carId)) {
        // Like entfernen
        const index = userLikes.indexOf(carId);
        userLikes.splice(index, 1);
        likes[carId] = (likes[carId] || 1) - 1;
        if (likes[carId] <= 0) delete likes[carId];
    } else {
        // Like hinzufügen
        userLikes.push(carId);
        likes[carId] = (likes[carId] || 0) + 1;
    }
    
    saveUserLikes(userLikes);
    saveLikes(likes);
    
    // Aktivität protokollieren
    logActivity('LIKE_TOGGLE', user.email, { 
        carId, 
        action: userLikes.includes(carId) ? 'liked' : 'unliked',
        timestamp: new Date().toISOString() 
    });
}

// Anzeigen des Benutzers anzeigen
function displayUserCars(cars) {
    const user = getCurrentUser();
    if (!user) {
        console.error('Benutzer nicht angemeldet');
        return;
    }
    
    console.log('Alle Anzeigen:', cars);
    console.log('Aktueller Benutzer:', user.email);
    
    const userCars = cars.filter(car => {
        console.log('Überprüfe Anzeige:', car.id, 'Autor:', car.author, 'aktueller Benutzer:', user.email);
        return car.author === user.email;
    });
    
    console.log('Gefundene Anzeigen des Benutzers:', userCars.length);
    
    const myAdsGrid = document.getElementById('myAdsGrid');
    if (!myAdsGrid) {
        console.error('Element myAdsGrid nicht gefunden');
        return;
    }
    
    if (userCars.length === 0) {
        myAdsGrid.innerHTML = '<div style="text-align: center; color: #666; grid-column: 1/-1; padding: 20px;">Sie haben noch keine Anzeigen</div>';
        return;
    }
    
    const likes = getLikes();
    
    myAdsGrid.innerHTML = userCars.map(car => `
        <div class="car-card" onclick="openCarDetails(${car.id})">
            <div class="car-image">
                ${car.images && car.images.length > 0 ? 
                    `<img src="${car.images[0]}" alt="${car.title}" style="width: 100%; height: 200px; object-fit: cover;">` : 
                    '<div style="width: 100%; height: 200px; background: linear-gradient(45deg, #f0f0f0, #e0e0e0); display: flex; align-items: center; justify-content: center; color: #999;">Kein Foto vorhanden</div>'
                }
                ${car.images && car.images.length > 1 ? `<div class="image-count">+${car.images.length - 1}</div>` : ''}
                ${likes[car.id] ? `<div class="like-count">❤️ ${likes[car.id]}</div>` : ''}
            </div>
            <div class="car-info">
                <div class="car-title">${car.title}</div>
                <div class="car-price">${formatPrice(car.price, car.currency || 'EUR')}</div>
                <div class="car-details">
                    <div>Jahr: ${car.year}</div>
                    <div>Kilometerstand: ${car.mileage.toLocaleString()} km</div>
                    <div>Kraftstoff: ${car.fuel}</div>
                    <div>Getriebe: ${car.transmission}</div>
                </div>
                <div class="car-description">${car.description.length > 100 ? car.description.substring(0, 100) + '...' : car.description}</div>
                <div class="car-contact">
                    <div class="car-author">Erstellt am: ${new Date(car.createdAt).toLocaleDateString()}</div>
                    <div>
                        <button class="edit-btn" onclick="event.stopPropagation(); editCar(${car.id})">Bearbeiten</button>
                        <button class="delete-btn" onclick="event.stopPropagation(); deleteUserCar(${car.id})">Löschen</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Anzeigen, die der Benutzer gemocht hat
function displayLikedCars(cars) {
    const userLikes = getUserLikes();
    const likedCars = cars.filter(car => userLikes.includes(car.id));
    const likedAdsGrid = document.getElementById('likedAdsGrid');
    
    if (likedCars.length === 0) {
        likedAdsGrid.innerHTML = '<div style="text-align: center; color: #666; grid-column: 1/-1;">Sie haben noch keine Anzeigen gemocht</div>';
        return;
    }
    
    const likes = getLikes();
    const userLikesSet = new Set(userLikes);
    
    likedAdsGrid.innerHTML = likedCars.map(car => `
        <div class="car-card" onclick="openCarDetails(${car.id})">
            <div class="car-image">
                ${car.images && car.images.length > 0 ? 
                    `<img src="${car.images[0]}" alt="${car.title}" style="width: 100%; height: 200px; object-fit: cover;">` : 
                    '<div style="width: 100%; height: 200px; background: linear-gradient(45deg, #f0f0f0, #e0e0e0); display: flex; align-items: center; justify-content: center; color: #999;">Kein Foto vorhanden</div>'
                }
                ${car.images && car.images.length > 1 ? `<div class="image-count">+${car.images.length - 1}</div>` : ''}
                <button class="like-btn ${userLikesSet.has(car.id) ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike(${car.id}); refreshLikedCars();">
                    ${userLikesSet.has(car.id) ? '❤️' : '🤍'}
                </button>
                ${likes[car.id] ? `<div class="like-count">❤️ ${likes[car.id]}</div>` : ''}
            </div>
            <div class="car-info">
                <div class="car-title">${car.title}</div>
                <div class="car-price">${formatPrice(car.price, car.currency || 'EUR')}</div>
                <div class="car-details">
                    <div>Jahr: ${car.year}</div>
                    <div>Kilometerstand: ${car.mileage.toLocaleString()} km</div>
                    <div>Kraftstoff: ${car.fuel}</div>
                    <div>Getriebe: ${car.transmission}</div>
                </div>
                <div class="car-description">${car.description.length > 100 ? car.description.substring(0, 100) + '...' : car.description}</div>
                <div class="car-contact">
                    <div class="car-author">Autor: ${car.authorName}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Anzeigen, die der Benutzer gemocht hat, aktualisieren
async function refreshLikedCars() {
    const cars = await loadCars();
    displayLikedCars(cars);
}

// Anzeige des Benutzers löschen
async function deleteUserCar(carId) {
    if (!confirm('Sind Sie sicher, dass Sie diese Anzeige löschen möchten?')) {
        return;
    }
    
    const cars = await loadCars();
    const updatedCars = cars.filter(car => car.id !== carId);
    saveCars(updatedCars);
    
    // Aktivität protokollieren
    logActivity('CAR_DELETE_USER', getCurrentUser().email, { carId, timestamp: new Date().toISOString() });
    
    // Anzeige aktualisieren
    displayUserCars(updatedCars);
}

// Anzeige bearbeiten (zurzeit nicht implementiert)
function editCar(carId) {
    alert('Bearbeitungsfunktion wird bald implementiert');
}

// Anzeige im Detail anzeigen
async function openCarDetails(carId) {
    const cars = await loadCars();
    const car = cars.find(c => c.id === carId);
    
    if (!car) return;
    
    const likes = getLikes();
    const userLikes = getUserLikes();
    const isLiked = userLikes.includes(carId);
    
    const modal = document.createElement('div');
    modal.className = 'car-detail-modal';
    modal.innerHTML = `
        <div class="car-detail-content">
            <span class="close-detail" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <div class="car-detail-header">
                <h2>${car.title}</h2>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${car.id}); this.classList.toggle('liked'); this.innerHTML = this.classList.contains('liked') ? '❤️' : '🤍';">
                        ${isLiked ? '❤️' : '🤍'}
                    </button>
                    <div class="car-detail-price">${formatPrice(car.price, car.currency || 'EUR')}</div>
                </div>
            </div>
            
            <div class="car-detail-images">
                ${car.images && car.images.length > 0 ? 
                    `<div class="main-image">
                        <img id="mainCarImage" src="${car.images[0]}" alt="${car.title}">
                    </div>
                    ${car.images.length > 1 ? 
                        `<div class="thumbnail-images">
                            ${car.images.map((img, index) => 
                                `<img src="${img}" alt="Foto ${index + 1}" onclick="document.getElementById('mainCarImage').src='${img}'">`
                            ).join('')}
                        </div>` : ''
                    }` : 
                    '<div class="no-image">Keine Fotos vorhanden</div>'
                }
            </div>
            
            <div class="car-detail-info">
                <div class="car-detail-specs">
                    <h3>Spezifikationen</h3>
                    <div class="specs-grid">
                        <div><strong>Marke:</strong> ${car.brand}</div>
                        <div><strong>Modell:</strong> ${car.model}</div>
                        <div><strong>Jahr:</strong> ${car.year}</div>
                        <div><strong>Kilometerstand:</strong> ${car.mileage.toLocaleString()} km</div>
                        <div><strong>Kraftstoff:</strong> ${car.fuel}</div>
                        <div><strong>Getriebe:</strong> ${car.transmission}</div>
                        <div><strong>Farbe:</strong> ${car.color}</div>
                        <div><strong>Likes:</strong> ${likes[car.id] || 0} ❤️</div>
                    </div>
                </div>
                
                <div class="car-detail-description">
                    <h3>Beschreibung</h3>
                    <p>${car.description}</p>
                </div>
                
                <div class="car-detail-contact">
                    <h3>Kontakt</h3>
                    <div class="contact-info">
                        <div class="phone"><strong>Telefon:</strong> ${car.phone}</div>
                        <div class="author"><strong>Verkäufer:</strong> ${car.authorName}</div>
                        <div class="date"><strong>Erstellt am:</strong> ${new Date(car.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
}

// Bildupload verarbeiten
function handleImageUpload(files) {
    const imagePreview = document.getElementById('imagePreview');
    const images = [];
    
    Array.from(files).forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'remove-image';
                imgContainer.innerHTML = `<img src="${e.target.result}" alt="Vorschau ${index}">`;
                imgContainer.onclick = () => {
                    imgContainer.remove();
                };
                imagePreview.appendChild(imgContainer);
                images.push(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
    
    return images;
}

// Neue Anzeige hinzufügen
async function addCar(carData) {
    const cars = await loadCars();
    const user = getCurrentUser();
    
    const newCar = {
        id: Date.now(),
        ...carData,
        author: user.email,
        authorName: user.name,
        createdAt: new Date().toISOString()
    };
    
    cars.push(newCar);
    saveCars(cars);
    
    // Aktivität protokollieren
    logActivity('CAR_ADD', user.email, { carTitle: newCar.title, timestamp: new Date().toISOString() });
    
    return newCar;
}

// Aktivität protokollieren
function logActivity(action, userEmail, details) {
    try {
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        const activity = {
            id: Date.now(),
            action,
            userEmail,
            details,
            timestamp: new Date().toISOString()
        };
        activities.push(activity);
        localStorage.setItem('activities', JSON.stringify(activities));
        console.log('Aktualisierte Aktivitäten (kopieren Sie in activity.json):', JSON.stringify(activities, null, 2));
    } catch (error) {
        console.error('Fehler beim Protokollieren:', error);
    }
}

// Seite initialisieren
document.addEventListener('DOMContentLoaded', async function() {
    const user = getCurrentUser();
    
    // Benutzerdaten laden
    async function loadUserData() {
        try {
            const user = getCurrentUser();
            if (!user) {
                window.location.href = 'auth.html';
                return;
            }

            // Profilinformationen aktualisieren
            document.getElementById('userName').textContent = user.name || 'Benutzer';
            document.getElementById('userEmail').textContent = user.email;

            // Benutzeranzeigen laden
            const cars = await loadCars();
            const userCars = cars.filter(car => car.authorEmail === user.email);
            
            displayUserCars(userCars);
            
        } catch (error) {
            console.error('Fehler beim Laden der Benutzerdaten:', error);
            alert('Beim Laden der Daten ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
        }
    }
    
    // Benutzerdaten laden
    await loadUserData();
    
    // Abmelden
    document.getElementById('logoutBtn').addEventListener('click', function() {
        logActivity('LOGOUT', user.email, { timestamp: new Date().toISOString() });
        localStorage.removeItem('current_user');
        window.location.href = 'auth.html';
    });
    
    // Katalog anzeigen
    document.getElementById('catalogBtn').addEventListener('click', function() {
        window.location.href = 'cars.html';
    });
    
    document.getElementById('adminBtn').addEventListener('click', function() {
        window.location.href = 'admin.html';
    });
    
    // Modal zum Hinzufügen einer Anzeige
    const modal = document.getElementById('addCarModal');
    const addCarBtn = document.getElementById('addCarBtn');
    const closeBtn = document.querySelector('.close');
    
    addCarBtn.addEventListener('click', function() {
        modal.style.display = 'block';
    });
    
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Bild-Upload-Handler
    document.getElementById('carImages').addEventListener('change', function(event) {
        handleImageUpload(event.target.files);
    });
    
    // Formular zum Hinzufügen einer Anzeige
    document.getElementById('addCarForm').addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Bilder aus der Vorschau sammeln
        const imageElements = document.querySelectorAll('#imagePreview img');
        const images = Array.from(imageElements).map(img => img.src);
        
        const carData = {
            title: document.getElementById('carTitle').value,
            brand: document.getElementById('carBrand').value,
            model: document.getElementById('carModel').value,
            year: parseInt(document.getElementById('carYear').value),
            price: parseInt(document.getElementById('carPrice').value),
            currency: document.getElementById('carCurrency').value,
            mileage: parseInt(document.getElementById('carMileage').value),
            fuel: document.getElementById('carFuel').value,
            transmission: document.getElementById('carTransmission').value,
            color: document.getElementById('carColor').value,
            phone: document.getElementById('carPhone').value,
            description: document.getElementById('carDescription').value,
            images: images
        };
        
        await addCar(carData);
        
        // Modal schließen und Formular zurücksetzen
        modal.style.display = 'none';
        document.getElementById('addCarForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        
        // Anzeige aktualisieren
        const cars = await loadCars();
        displayUserCars(cars);
        
        alert('Anzeige erfolgreich hinzugefügt!');
    });
});
