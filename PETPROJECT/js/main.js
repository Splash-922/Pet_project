// Получаем информацию о текущем пользователе
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('current_user') || '{}');
}

// Отображаем информацию о пользователе
function displayUserInfo() {
    const user = getCurrentUser();
    if (user.name && user.email) {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userEmail').textContent = user.email;
        
        // Показываем ссылку на админку только для админа
        if (user.email === 'admin@mail.ru') {
            document.getElementById('adminLink').style.display = 'inline-block';
        }
    } else {
        // Если нет информации о пользователе, перенаправляем на страницу входа
        window.location.href = 'auth.html';
    }
}

// Функция выхода
function logout() {
    const user = getCurrentUser();
    
    // Логируем выход из системы
    if (user.email) {
        logActivity('LOGOUT', user.email, { name: user.name, timestamp: new Date().toISOString() });
    }
    
    localStorage.removeItem('current_user');
    alert('Вы вышли из системы');
    window.location.href = 'auth.html';
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

// Загружаем информацию при загрузке страницы
window.onload = function() {
    displayUserInfo();
};
