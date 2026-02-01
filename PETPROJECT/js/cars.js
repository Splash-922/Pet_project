// Функция для загрузки данных из localStorage
function loadFromStorage(key, defaultValue = []) {
    try {
        const data = localStorage.getItem(key);
        if (data) {
            return JSON.parse(data);
        }
        // Если данных нет, сохраняем значение по умолчанию
        if (defaultValue !== null) {
            localStorage.setItem(key, JSON.stringify(defaultValue));
        }
        return defaultValue;
    } catch (e) {
        console.error(`Ошибка при загрузке из localStorage (${key}):`, e);
        return defaultValue;
    }
}

// Загрузка данных автомобилей
async function loadCars() {
    try {
        // Загружаем только из localStorage
        const cars = JSON.parse(localStorage.getItem('cars')) || [];
        console.log('Загружены автомобили:', cars);
        return cars;
    } catch (error) {
        console.error('Ошибка при загрузке автомобилей:', error);
        return [];
    }
}

// Сохранение данных автомобилей
function saveCars(cars) {
    localStorage.setItem('cars', JSON.stringify(cars));
    console.log('Обновленные объявления (скопируйте в cars.json):', JSON.stringify(cars, null, 2));
}

// Проверка, является ли текущий пользователь администратором
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Получение текущего пользователя
function getCurrentUser() {
    const user = localStorage.getItem('current_user');
    return user ? JSON.parse(user) : null;
}

// Получение пользователя по email
async function getUserByEmail(email) {
    const users = loadFromStorage('users', [
        // Пример пользователя по умолчанию (админ)
        {
            email: 'admin@example.com',
            password: 'admin', // В реальном приложении пароль должен быть хеширован
            name: 'Администратор',
            isAdmin: true
        }
    ]);
    
    return users.find(user => user.email === email) || null;
}

// Получение всех пользователей
async function getAllUsers() {
    return loadFromStorage('users', [
        {
            email: 'admin@example.com',
            password: 'admin',
            name: 'Администратор',
            isAdmin: true
        }
    ]);
}

// Обновление данных пользователя
async function updateUser(updatedUser) {
    try {
        const users = await getAllUsers();
        const updatedUsers = users.map(user => 
            user.email === updatedUser.email ? updatedUser : user
        );
        
        // Сохраняем обновленных пользователей в localStorage
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        
        // Обновляем текущего пользователя, если это он
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.email === updatedUser.email) {
            localStorage.setItem('current_user', JSON.stringify(updatedUser));
        }
        
        return updatedUser;
    } catch (error) {
        console.error('Ошибка при обновлении пользователя:', error);
        throw error;
    }
}

// Добавление уведомления пользователю
async function addNotification(userEmail, message, type = 'info', relatedCarId = null) {
    try {
        const user = await getUserByEmail(userEmail);
        if (!user) return false;
        
        const notification = {
            id: Date.now(),
            message,
            type,
            relatedCarId,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        user.notifications = user.notifications || [];
        user.notifications.unshift(notification); // Добавляем в начало массива
        
        return await updateUser(user);
    } catch (error) {
        console.error('Error adding notification:', error);
        return false;
    }
}

// Пометить уведомление как прочитанное
async function markNotificationAsRead(userEmail, notificationId) {
    try {
        const user = await getUserByEmail(userEmail);
        if (!user || !user.notifications) return false;
        
        const notification = user.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            return await updateUser(user);
        }
        return false;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
}

// Получение непрочитанных уведомлений
async function getUnreadNotifications(userEmail) {
    try {
        const user = await getUserByEmail(userEmail);
        if (!user || !user.notifications) return [];
        return user.notifications.filter(n => !n.read);
    } catch (error) {
        console.error('Error getting unread notifications:', error);
        return [];
    }
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

async function toggleLike(carId) {
    const user = getCurrentUser();
    if (!user) {
        alert('Необходимо войти в систему для лайков');
        return;
    }
    
    const likes = getLikes();
    const userLikes = getUserLikes();
    const likeBtn = document.querySelector(`[onclick*="toggleLike(${carId})"]`);
    
    // Получаем информацию об объявлении
    const cars = await loadCars();
    const car = cars.find(c => c.id === carId);
    
    if (userLikes.includes(carId)) {
        // Убираем лайк
        const index = userLikes.indexOf(carId);
        userLikes.splice(index, 1);
        likes[carId] = (likes[carId] || 1) - 1;
        if (likes[carId] <= 0) delete likes[carId];
        
        if (likeBtn) {
            likeBtn.classList.remove('liked');
            likeBtn.innerHTML = '🤍';
            likeBtn.style.animation = 'heartPulse 0.3s ease-out';
        }
    } else {
        // Добавляем лайк
        userLikes.push(carId);
        likes[carId] = (likes[carId] || 0) + 1;
        
        if (likeBtn) {
            likeBtn.classList.add('liked');
            likeBtn.innerHTML = '❤️';
            likeBtn.style.animation = 'heartBeat 0.6s ease-out';
            
            // Создаем эффект частиц
            createHeartParticles(likeBtn);
        }
        
        // Отправляем уведомление владельцу объявления, если это не его объявление
        if (car && car.author && car.author !== user.email) {
            const message = `${user.name} понравилось ваше объявление "${car.title}"`;
            
            // Добавляем уведомление в систему
            await addNotification(car.author, message, 'like', carId);
            
            // Отправляем email-уведомление владельцу объявления
            try {
                const owner = getUserByEmail(car.author);
                if (owner && owner.email) {
                    await sendEmailNotification(
                        owner.email,
                        car.title,
                        user.name,
                        carId
                    );
                    console.log('Email notification sent to:', owner.email);
                }
            } catch (error) {
                console.error('Error sending email notification:', error);
            }
            
            // Обновляем бейдж с уведомлениями
            updateNotificationBadge();
        }
    }
    
    saveUserLikes(userLikes);
    saveLikes(likes);
    
    // Логируем активность
    logActivity('LIKE_TOGGLE', user.email, { 
        carId, 
        action: userLikes.includes(carId) ? 'liked' : 'unliked',
        timestamp: new Date().toISOString() 
    });
    
    // Сбрасываем анимацию через некоторое время
    setTimeout(() => {
        if (likeBtn) likeBtn.style.animation = '';
    }, 600);
}

// Создание эффекта частиц при лайке
function createHeartParticles(button) {
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.innerHTML = '❤️';
        
        const randomX = (Math.random() - 0.5) * 100;
        const randomY = -Math.random() * 80 - 20;
        
        particle.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            font-size: ${8 + Math.random() * 8}px;
            pointer-events: none;
            z-index: 1000;
            transform: translate(0, 0) scale(1);
            opacity: 1;
            transition: all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;
        
        document.body.appendChild(particle);
        
        // Запускаем анимацию
        setTimeout(() => {
            particle.style.transform = `translate(${randomX}px, ${randomY}px) scale(0)`;
            particle.style.opacity = '0';
        }, 50 + i * 50);
        
        // Удаляем частицу после анимации
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 1200);
    }
}

// Обновление каталога
async function refreshCatalog() {
    const cars = await loadCars();
    applyFilters();
}

// Форматирование цены с валютой
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
    
    // Для некоторых валют символ идет после цены
    const postfixCurrencies = ['PLN', 'CZK', 'SEK', 'NOK', 'DKK'];
    
    if (postfixCurrencies.includes(currency)) {
        return `${formattedPrice} ${symbol}`;
    } else {
        return `${symbol} ${formattedPrice}`;
    }
}

// Отображение объявлений
function displayCars(cars) {
    console.log('Anzeige der Fahrzeuge:', cars);
    const carsGrid = document.getElementById('carsList');
    
    if (!carsGrid) {
        console.error('Element mit der ID "carsList" wurde nicht gefunden');
        return;
    }
    
    if (!cars || !Array.isArray(cars) || cars.length === 0) {
        console.log('Keine Fahrzeuge zum Anzeigen vorhanden');
        carsGrid.innerHTML = `
            <div style="text-align: center; color: #666; grid-column: 1/-1; padding: 20px;">
                Keine Anzeigen gefunden. Seien Sie der Erste, der eine Anzeige erstellt!
                <button id="addFirstCarBtn" class="btn-primary" style="margin-top: 10px;">Anzeige erstellen</button>
            </div>`;
        
        // Event-Listener für den Button zum Erstellen einer Anzeige hinzufügen
        const addFirstCarBtn = document.getElementById('addFirstCarBtn');
        if (addFirstCarBtn) {
            addFirstCarBtn.addEventListener('click', () => {
                const addCarBtn = document.getElementById('addCarBtn');
                if (addCarBtn) addCarBtn.click();
            });
        }
        return;
    }
    
    try {
        const likes = getLikes();
        const userLikes = getUserLikes();
        const userLikesSet = new Set(userLikes);
        
        // Sortieren nach Erstellungsdatum (neueste zuerst)
        const sortedCars = [...cars].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });
        
        carsGrid.innerHTML = sortedCars.map(car => `
            <div class="car-card" data-car-id="${car.id}">
                <div class="car-image">
                    ${car.images && car.images.length > 0 ? 
                        `<img src="${car.images[0]}" alt="${car.title}" loading="lazy" 
                              style="width: 100%; height: 200px; object-fit: cover; cursor: pointer;"
                              onclick="openCarDetails(${car.id})">` : 
                        `<div style="width: 100%; height: 200px; background: linear-gradient(45deg, #f0f0f0, #e0e0e0); 
                          display: flex; align-items: center; justify-content: center; color: #999; cursor: pointer;"
                          onclick="openCarDetails(${car.id})">
                            Kein Foto verfügbar
                        </div>`
                    }
                    ${car.images && car.images.length > 1 ? 
                        `<div class="image-count" onclick="openCarDetails(${car.id})">+${car.images.length - 1}</div>` : ''}
                    <button class="like-btn ${userLikesSet.has(car.id) ? 'liked' : ''}" 
                            onclick="event.stopPropagation(); toggleLike(${car.id});">
                        ${userLikesSet.has(car.id) ? '❤️' : '🤍'}
                    </button>
                    ${likes[car.id] ? `<div class="like-count">❤️ ${likes[car.id]}</div>` : ''}
                </div>
                <div class="car-info">
                    <h3 class="car-title" onclick="openCarDetails(${car.id})" style="cursor: pointer;">
                        ${car.title || 'Ohne Titel'}
                    </h3>
                    <div class="car-price">${formatPrice(car.price, car.currency || 'RUB')}</div>
                    <div class="car-details">
                        <div><strong>Jahr:</strong> ${car.year || '—'}</div>
                        <div><strong>Kilometerstand:</strong> ${car.mileage ? car.mileage.toLocaleString() + ' km' : '—'}</div>
                        <div><strong>Kraftstoff:</strong> ${car.fuel || '—'}</div>
                        <div><strong>Getriebe:</strong> ${car.transmission || '—'}</div>
                    </div>
                    <div class="car-description" onclick="openCarDetails(${car.id})" style="cursor: pointer;">
                        ${car.description ? 
                            (car.description.length > 100 ? car.description.substring(0, 100) + '...' : car.description) : 
                            'Keine Beschreibung verfügbar'}
                    </div>
                    <div class="car-contact">
                        <div class="car-author">
                            <i class="fas fa-user"></i> ${car.authorName || 'Unbekannter Verkäufer'}
                        </div>
                        ${isAdmin() ? 
                            `<button class="delete-btn" 
                                     onclick="event.stopPropagation(); 
                                     if(confirm('Вы уверены, что хотите удалить это объявление?')) { 
                                         deleteCar(${car.id}); 
                                     }">
                                Löschen
                            </button>` : 
                            ''
                        }
                    </div>
                </div>
            </div>
        `).join('');
        
        console.log('Anzeigen erfolgreich angezeigt');
    } catch (error) {
        console.error('Fehler beim Anzeigen der Fahrzeuge:', error);
        carsGrid.innerHTML = `
            <div style="text-align: center; color: #ff4444; grid-column: 1/-1; padding: 20px;">
                Beim Laden der Anzeigen ist ein Fehler aufgetreten. Bitte aktualisieren Sie die Seite.
            </div>`;
    }
}
// Применение фильтров
async function applyFilters() {
    // Обновляем значения фильтров из полей ввода
    const brandSelect = document.getElementById('brandFilter');
    const yearFromInput = document.getElementById('yearFrom');
    const yearToInput = document.getElementById('yearTo');
    const priceFromInput = document.getElementById('priceFrom');
    const priceToInput = document.getElementById('priceTo');
    
    // Обновляем значения фильтров
    if (brandSelect) brandFilter = brandSelect.value;
    
    // Устанавливаем значения по умолчанию, если поля пустые
    const yearFrom = yearFromInput ? parseInt(yearFromInput.value) || 0 : 0;
    const yearTo = yearToInput ? parseInt(yearToInput.value) || new Date().getFullYear() : new Date().getFullYear();
    minPrice = priceFromInput ? parseInt(priceFromInput.value) || 0 : 0;
    maxPrice = priceToInput ? parseInt(priceToInput.value) || 10000000 : 10000000;
    
    // Загружаем автомобили
    const cars = await loadCars();
    
    // Фильтруем автомобили
    const filteredCars = cars.filter(car => {
        const matchesBrand = !brandFilter || (car.brand && car.brand.toLowerCase() === brandFilter.toLowerCase());
        const matchesYear = (!yearFrom || car.year >= yearFrom) && (!yearTo || car.year <= yearTo);
        const matchesPrice = car.price >= minPrice && car.price <= maxPrice;
        
        return matchesBrand && matchesYear && matchesPrice;
    });
    
    // Сортируем по дате создания (новые сначала)
    filteredCars.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
    });
    
    // Отображаем отфильтрованные автомобили
    displayCars(filteredCars);
}

// Фильтрация объявлений
function filterCars(cars) {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const brandFilter = document.getElementById('brandFilter').value;
    const currencyFilter = document.getElementById('currencyFilter').value;
    const priceFrom = parseInt(document.getElementById('priceFrom').value) || 0;
    const priceTo = parseInt(document.getElementById('priceTo').value) || Infinity;
    
    return cars.filter(car => {
        const matchesSearch = car.title.toLowerCase().includes(searchTerm) || 
                            car.brand.toLowerCase().includes(searchTerm) ||
                            car.model.toLowerCase().includes(searchTerm);
        const matchesBrand = !brandFilter || car.brand === brandFilter;
        const matchesCurrency = !currencyFilter || (car.currency || 'RUB') === currencyFilter;
        const matchesPrice = car.price >= priceFrom && car.price <= priceTo;
        
        return matchesSearch && matchesBrand && matchesCurrency && matchesPrice;
    });
}

// Удаление объявления (только для админа)
async function deleteCar(carId) {
    if (!isAdmin()) {
        alert('Только администратор может удалять объявления');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить это объявление?')) {
        return;
    }
    
    const cars = await loadCars();
    const updatedCars = cars.filter(car => car.id !== carId);
    saveCars(updatedCars);
    
    // Логирование активности
    logActivity('CAR_DELETE', getCurrentUser().email, { carId, timestamp: new Date().toISOString() });
    
    // Обновляем отображение
    const filteredCars = filterCars(updatedCars);
    displayCars(filteredCars);
}

// Обработка загрузки изображений
function handleImageUpload(files) {
    const imagePreview = document.getElementById('imagePreview');
    const images = [];
    
    Array.from(files).forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'remove-image';
                imgContainer.innerHTML = `<img src="${e.target.result}" alt="Preview ${index}">`;
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

// Открытие детального просмотра объявления
async function openCarDetails(carId) {
    const cars = await loadCars();
    const car = cars.find(c => c.id === carId);
    
    if (!car) return;
    
    const modal = document.createElement('div');
    modal.className = 'car-detail-modal';
    modal.innerHTML = `
        <div class="car-detail-content">
            <span class="close-detail" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <div class="car-detail-header">
                <h2>${car.title}</h2>
                <div class="car-detail-price">${formatPrice(car.price, car.currency || 'RUB')}</div>
            </div>
            
            <div class="car-detail-images">
                ${car.images && car.images.length > 0 ? 
                    `<div class="main-image">
                        <img id="mainCarImage" src="${car.images[0]}" alt="${car.title}">
                    </div>
                    ${car.images.length > 1 ? 
                        `<div class="thumbnail-images">
                            ${car.images.map((img, index) => 
                                `<img src="${img}" alt="Фото ${index + 1}" onclick="document.getElementById('mainCarImage').src='${img}'">`
                            ).join('')}
                        </div>` : ''
                    }` : 
                    '<div class="no-image">Фотографии отсутствуют</div>'
                }
            </div>
            
            <div class="car-detail-info">
                <div class="car-detail-specs">
                    <h3>Характеристики</h3>
                    <div class="specs-grid">
                        <div><strong>Марка:</strong> ${car.brand}</div>
                        <div><strong>Модель:</strong> ${car.model}</div>
                        <div><strong>Год:</strong> ${car.year}</div>
                        <div><strong>Пробег:</strong> ${car.mileage.toLocaleString()} км</div>
                        <div><strong>Топливо:</strong> ${car.fuel}</div>
                        <div><strong>КПП:</strong> ${car.transmission}</div>
                        <div><strong>Цвет:</strong> ${car.color}</div>
                    </div>
                </div>
                
                <div class="car-detail-description">
                    <h3>Описание</h3>
                    <p>${car.description}</p>
                </div>
                
                <div class="car-detail-contact">
                    <h3>Контакты</h3>
                    <div class="contact-info">
                        <div class="phone"><strong>Телефон:</strong> ${car.phone}</div>
                        <div class="author"><strong>Продавец:</strong> ${car.authorName}</div>
                        <div class="date"><strong>Размещено:</strong> ${new Date(car.createdAt).toLocaleDateString()}</div>
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

// Открытие модального окна с изображением
function openImageModal(imageSrc) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 2000; display: flex;
        align-items: center; justify-content: center; cursor: pointer;
    `;
    modal.innerHTML = `<img src="${imageSrc}" style="max-width: 90%; max-height: 90%; object-fit: contain;">`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

// Добавление нового объявления
async function addCar(carData) {
    const cars = await loadCars();
    const user = getCurrentUser();
    
    const newCar = {
        id: Date.now(), // Простой способ генерации ID
        ...carData,
        author: user.email,
        authorName: user.name,
        createdAt: new Date().toISOString()
    };
    
    cars.push(newCar);
    saveCars(cars);
    
    // Логирование активности
    logActivity('CAR_ADD', user.email, { carTitle: newCar.title, timestamp: new Date().toISOString() });
    
    return newCar;
}

// Логирование активности
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
        console.log('Обновленные логи активности (скопируйте в activity.json):', JSON.stringify(activities, null, 2));
    } catch (error) {
        console.error('Ошибка логирования:', error);
    }
}

// Функция для обновления бейджа уведомлений
function updateNotificationBadge() {
    const user = getCurrentUser();
    if (!user) return;
    
    const unreadCount = getUnreadNotifications(user.email).length;
    const badge = document.getElementById('notificationBadge');
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Функция для отправки email-уведомления
async function sendEmailNotification(toEmail, carTitle, likerName, carId) {
    try {
        const templateParams = {
            to_email: toEmail,
            car_title: carTitle,
            liker_name: likerName,
            car_id: carId,
            site_url: window.location.origin,
            date: new Date().toLocaleDateString('ru-RU')
        };

        // Отправка письма через EmailJS
        const response = await emailjs.send(
            'service_project', // Замените на ID вашего сервиса в EmailJS
            'service_project', // Замените на ID вашего шаблона в EmailJS
            templateParams
        );

        console.log('Email sent successfully:', response);
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
}

// Функция для отображения уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Автоматическое скрытие уведомления через 5 секунд
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Система лайков
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
    const userLikes = JSON.parse(localStorage.getItem(`user_likes_${user.id}`) || '[]');
    return Array.isArray(userLikes) ? userLikes : [];
}

function saveUserLikes(userId, likes) {
    localStorage.setItem(`user_likes_${userId}`, JSON.stringify(likes));
}

// Глобальные переменные для фильтров
let brandFilter = '';
let currencyFilter = '';
let minPrice = 0;
let maxPrice = 10000000; // Большое значение по умолчанию
let searchQuery = '';

// Глобальная переменная для хранения загруженных автомобилей
let allCars = [];

// Инициализация страницы
document.addEventListener('DOMContentLoaded', async function() {
    const user = getCurrentUser();
    
    // Проверяем авторизацию
    if (!user) {
        showNotification('Необходимо войти в систему', 'error');
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1500);
        return;
    }
    
    // Показываем кнопку админ панели для админа
    if (isAdmin()) {
        document.getElementById('adminBtn').style.display = 'block';
    }
    
    // Загружаем автомобили
    allCars = await loadCars();
    
    // Инициализация значений фильтров
    const brandSelect = document.getElementById('brandFilter');
    const yearFromInput = document.getElementById('yearFrom');
    const yearToInput = document.getElementById('yearTo');
    const priceFromInput = document.getElementById('priceFrom');
    const priceToInput = document.getElementById('priceTo');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    
    // Устанавливаем начальные значения фильтров
    if (brandSelect) brandFilter = brandSelect.value;
    if (priceFromInput) minPrice = parseInt(priceFromInput.value) || 0;
    if (priceToInput) maxPrice = parseInt(priceToInput.value) || 10000000;
    
    // Добавляем обработчики для кнопок фильтров
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function() {
            // Сбрасываем значения полей
            if (brandSelect) brandSelect.value = '';
            if (yearFromInput) yearFromInput.value = '';
            if (yearToInput) yearToInput.value = '';
            if (priceFromInput) priceFromInput.value = '';
            if (priceToInput) priceToInput.value = '';
            
            // Сбрасываем фильтры
            brandFilter = '';
            minPrice = 0;
            maxPrice = 10000000;
            
            // Применяем сброшенные фильтры
            applyFilters();
        });
    }
    
    // Отображаем автомобили после загрузки и настройки фильтров
    displayCars(allCars);
    
    // Обработчики событий для кнопок в хедере
    const setupHeaderButtons = () => {
        // Кнопка выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const user = getCurrentUser();
                if (user) {
                    logActivity('LOGOUT', user.email, { timestamp: new Date().toISOString() });
                }
                localStorage.removeItem('current_user');
                window.location.href = 'auth.html';
            });
        }
        
        // Кнопка админки
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'admin.html';
            });
        }
        
        // Кнопка личного кабинета
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const user = getCurrentUser();
                if (!user) {
                    showNotification('Пожалуйста, войдите в систему', 'error');
                    setTimeout(() => {
                        window.location.href = 'auth.html';
                    }, 1500);
                    return;
                }
                window.location.href = 'profile.html';
            });
        }
    };
    
    // Инициализация кнопок
    setupHeaderButtons();
    
    // Переходим в личный кабинет
    // window.location.href = 'profile.html';
    
    // Фильтрация
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', async function() {
            const cars = await loadCars();
            const filteredCars = filterCars(cars);
            displayCars(filteredCars);
        });
    } else {
        console.warn('Элемент filterBtn не найден');
    }
    
    // Поиск в реальном времени
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', async function() {
            const cars = await loadCars();
            const filteredCars = filterCars(cars);
            displayCars(filteredCars);
        });
    } else {
        console.warn('Элемент searchInput не найден');
    }

    // Кнопка добавления объявления
    const addCarBtn = document.getElementById('addCarBtn');
    const modal = document.getElementById('addCarModal');
    const closeBtn = document.querySelector('.close');
    const modalContent = document.querySelector('.modal-content');

    // Функция для открытия модального окна
    function openModal() {
        if (modal) {
            modal.style.display = 'block';
            // Очищаем форму при открытии
            const form = document.getElementById('addCarForm');
            if (form) form.reset();
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview) imagePreview.innerHTML = '';
        }
    }

    // Функция для закрытия модального окна
    function closeModal() {
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Обработчики событий
    if (addCarBtn) {
        addCarBtn.addEventListener('click', openModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Закрытие при клике вне модального окна
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Предотвращаем закрытие при клике на само модальное окно
    if (modalContent) {
        modalContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Обработчик загрузки изображений
    const carImagesInput = document.getElementById('carImages');
    if (carImagesInput) {
        carImagesInput.addEventListener('change', function(event) {
            handleImageUpload(event.target.files);
        });
    }
    
    // Обработка формы добавления объявления
    const addCarForm = document.getElementById('addCarForm');
    if (addCarForm) {
        addCarForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Собираем изображения из превью
            const imageElements = document.querySelectorAll('#imagePreview img');
            const images = Array.from(imageElements).map(img => img.src);
            
            const user = getCurrentUser();
            const carData = {
                id: Date.now(),
                title: document.getElementById('carTitle').value,
                brand: document.getElementById('carBrand').value,
                model: document.getElementById('carModel').value,
                year: parseInt(document.getElementById('carYear').value) || 0,
                price: parseFloat(document.getElementById('carPrice').value) || 0,
                currency: document.getElementById('carCurrency').value || 'RUB',
                mileage: parseInt(document.getElementById('carMileage').value) || 0,
                fuel: document.getElementById('carFuel').value || 'Не указано',
                transmission: document.getElementById('carTransmission').value || 'Не указана',
                color: document.getElementById('carColor').value || 'Не указан',
                phone: document.getElementById('carPhone').value || 'Не указан',
                description: document.getElementById('carDescription').value || '',
                images: images,
                author: user ? user.email : 'anonymous',
                authorName: user ? user.name : 'Анонимный пользователь',
                createdAt: new Date().toISOString(),
                likes: 0,
                likedBy: []
            };

            // Добавляем автомобиль
            const cars = await loadCars();
            cars.push(carData);
            saveCars(cars);
            
            // Сортируем и отображаем отфильтрованные автомобили
            const filteredCars = filterCars(cars);
            displayCars(filteredCars);
            
            // Обновляем глобальную переменную allCars для других функций
            window.allCars = filteredCars;
            
            // Закрываем модальное окно
            if (modal) modal.style.display = 'none';
            
            // Очищаем форму
            addCarForm.reset();
            document.getElementById('imagePreview').innerHTML = '';
            
            // Показываем уведомление
            showNotification('Объявление успешно добавлено!', 'success');
        });
    }
});
