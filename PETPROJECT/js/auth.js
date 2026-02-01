// Загружаем пользователей из файла или localStorage
async function loadUsers() {
    try {
        // Сначала пытаемся загрузить из localStorage
        let users = JSON.parse(localStorage.getItem('petproject_users') || '[]');
        
        // Если нет данных в localStorage, создаем дефолтных пользователей
        if (users.length === 0) {
            users = [
                {
                    "name": "Test User",
                    "email": "test@mail.ru",
                    "password": "123456"
                },
                {
                    "name": "Admin",
                    "email": "admin@mail.ru", 
                    "password": "admin"
                }
            ];
            localStorage.setItem('petproject_users', JSON.stringify(users));
            console.log('Созданы дефолтные пользователи');
        }
        
        return users;
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        return [];
    }
}

// Сохранение пользователей
function saveUsers(users) {
    localStorage.setItem('petproject_users', JSON.stringify(users));
    updateUsersFile(users);
}

function updateUsersFile(users) {
    const jsonData = JSON.stringify(users, null, 2);
    console.log('=== ОБНОВЛЕННЫЙ users.json ===');
    console.log(jsonData);
    console.log('=== СКОПИРУЙТЕ И ВСТАВЬТЕ В РЕДАКТОР ===');
}

// Получение текущего пользователя
function getCurrentUser() {
    try {
        const user = localStorage.getItem('current_user');
        if (!user) return null;
        
        // Проверяем, является ли user уже объектом (может быть, если сохранен как объект)
        if (typeof user === 'object') return user;
        
        // Пытаемся распарсить JSON
        return JSON.parse(user);
    } catch (error) {
        console.error('Ошибка при получении текущего пользователя:', error);
        return null;
    }
}

// Получение пользователя по email
async function getUserByEmail(email) {
    try {
        const response = await fetch('../data/users.json');
        const users = await response.json();
        return users.find(user => user.email === email);
    } catch (error) {
        console.error('Error fetching users:', error);
        return null;
    }
}

// Обновление данных пользователя
async function updateUser(updatedUser) {
    try {
        const users = await loadUsers();
        const updatedUsers = users.map(user => 
            user.email === updatedUser.email ? updatedUser : user
        );
        saveUsers(updatedUsers);
        
        // Обновляем текущего пользователя в localStorage, если это он
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.email === updatedUser.email) {
            localStorage.setItem('current_user', JSON.stringify(updatedUser));
        }
        
        return true;
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        return false;
    }
}

// Логирование активности
function logActivity(action, userEmail, details = {}) {
    const activity = JSON.parse(localStorage.getItem('petproject_activity') || '[]');
    const logEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: action,
        userEmail: userEmail,
        details: details,
        userAgent: navigator.userAgent.substring(0, 100)
    };
    
    activity.push(logEntry);
    localStorage.setItem('petproject_activity', JSON.stringify(activity));
    updateActivityFile(activity);
}

function updateActivityFile(activity) {
    const jsonData = JSON.stringify(activity, null, 2);
    console.log('=== ОБНОВЛЕННЫЙ activity.json ===');
    console.log(jsonData);
    console.log('=== СКОПИРУЙТЕ И ВСТАВЬТЕ В РЕДАКТОР ===');
}

// Переключение между формами
function toggleForms() {
    const container = document.querySelector('.container');
    container.classList.toggle("active");
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    const users = await loadUsers();
    
    // Принудительно очищаем поля от автозаполнения браузера
    const clearFields = () => {
        const emailField = document.getElementById('loginEmail');
        const passwordField = document.getElementById('loginPassword');
        
        // Множественная очистка разными способами
        emailField.value = '';
        passwordField.value = '';
        emailField.setAttribute('value', '');
        passwordField.setAttribute('value', '');
        emailField.defaultValue = '';
        passwordField.defaultValue = '';
        
        // Сброс readonly после очистки
        emailField.removeAttribute('readonly');
        passwordField.removeAttribute('readonly');
    };
    
    // Очищаем несколько раз с разными интервалами
    setTimeout(clearFields, 50);
    setTimeout(clearFields, 200);
    setTimeout(clearFields, 500);
    setTimeout(clearFields, 1000);
    setTimeout(clearFields, 2000);
    
    // Регистрация пользователя
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        const currentUsers = await loadUsers();
        const existingUser = currentUsers.find(user => user.email === email);
        if (existingUser) {
            alert("User with this email already exists!");
            return;
        }

        currentUsers.push({ name, email, password });
        saveUsers(currentUsers);
        
        alert("Registration successful! Please log in.");
        toggleForms();
    });

    // Авторизация пользователя
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log('Форма входа отправлена');

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        
        console.log('Введенные данные:', { email, password });

        try {
            // Загружаем пользователей из localStorage
            const currentUsers = JSON.parse(localStorage.getItem('petproject_users') || '[]');
            console.log('Загружены пользователи из localStorage:', currentUsers);
            
            // Ищем пользователя
            const user = currentUsers.find(u => 
                u.email && u.email.trim().toLowerCase() === email.toLowerCase() && 
                u.password && u.password === password
            );
            
            console.log('Найденный пользователь:', user);
            
            if (user) {
                console.log('Успешная аутентификация для:', user.email);
                localStorage.setItem('current_user', JSON.stringify(user));
                
                // Логируем вход
                logActivity('LOGIN', email, { 
                    name: user.name, 
                    timestamp: new Date().toISOString() 
                });
                
                // Перенаправляем в зависимости от роли
                if (user.email.toLowerCase() === 'admin@mail.ru') {
                    console.log('Перенаправление в админ-панель');
                    window.location.href = 'admin.html';
                } else {
                    console.log('Перенаправление на главную страницу');
                    window.location.href = 'main.html';
                }
            } else {
                const errorMsg = 'Неверный email или пароль';
                console.error(errorMsg);
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Ошибка при входе:', error);
            alert('Произошла ошибка при входе: ' + error.message);
        }
    });
});
