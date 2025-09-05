const chatMessages = document.getElementById('chat-messages');
const emojiBackground = document.getElementById('emoji-background');

let emojis = [];

// Función para detectar emojis en el mensaje
function extractEmojis(text) {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    return text.match(emojiRegex) || [];
}

// Función para crear emoji flotante
function createFloatingEmoji(emoji, emoteId = null) {
    const emojiElement = document.createElement('div');
    emojiElement.className = 'emoji';
    emojiElement.style.left = Math.random() * 90 + '%';
    emojiElement.style.top = '100%';
    emojiElement.style.animationDuration = (Math.random() * 5 + 5) + 's';

    if (emoteId) {
        // Es un emote de Twitch
        const img = document.createElement('img');
        img.src = `https://static-cdn.jtvnw.net/emoticons/v1/${emoteId}/1.0`;
        img.style.width = '2rem';
        img.style.height = '2rem';
        emojiElement.appendChild(img);
    } else {
        // Emoji Unicode
        emojiElement.textContent = emoji;
    }

    emojiBackground.appendChild(emojiElement);

    // Remover después de la animación
    setTimeout(() => {
        emojiElement.remove();
    }, 10000);
}

// Conectar a Twitch IRC
const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

ws.onopen = function() {
    ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
    ws.send('PASS oauth:'); // No auth needed for reading
    ws.send('NICK justinfan12345'); // Anonymous user
    ws.send('JOIN #voundiz');
};

ws.onmessage = function(event) {
    const message = event.data;
    if (message.startsWith('PING')) {
        ws.send('PONG :tmi.twitch.tv');
        return;
    }
    if (message.includes('PRIVMSG')) {
        const parts = message.split(' ');
        const tagsStr = parts[0].substring(1); // Remove @
        const channel = parts[3];
        const msg = parts.slice(4).join(' ').substring(1);

        // Parse tags
        const tags = {};
        tagsStr.split(';').forEach(tag => {
            const [key, value] = tag.split('=');
            tags[key] = value;
        });

        const displayName = tags['display-name'] || 'Usuario';

        // Parse emotes
        const emotes = [];
        if (tags['emotes']) {
            tags['emotes'].split('/').forEach(emote => {
                const [id, positions] = emote.split(':');
                positions.split(',').forEach(pos => {
                    const [start, end] = pos.split('-').map(Number);
                    const emoteText = msg.substring(start, end + 1);
                    emotes.push({ id, text: emoteText });
                });
            });
        }

        // Reemplazar emotes en el mensaje con imágenes
        let displayMsg = msg;
        emotes.forEach(emote => {
            const imgTag = `<img src="https://static-cdn.jtvnw.net/emoticons/v1/${emote.id}/1.0" style="width:1.2em; height:1.2em; vertical-align:middle;" />`;
            displayMsg = displayMsg.replace(emote.text, imgTag);
        });

        // Agregar mensaje al chat
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.innerHTML = `<span class="username">${displayName}:</span> <span class="text">${displayMsg}</span>`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Extraer y crear emojis/emotes flotantes
        const messageEmojis = extractEmojis(msg);
        console.log('Emojis detectados:', messageEmojis);
        messageEmojis.forEach(emoji => {
            createFloatingEmoji(emoji);
        });
        console.log('Emotes detectados:', emotes);
        emotes.forEach(emote => {
            createFloatingEmoji(emote.text, emote.id);
        });

        // Limitar mensajes para no sobrecargar
        if (chatMessages.children.length > 50) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
    }
};

ws.onerror = function(error) {
    console.error('Error en WebSocket:', error);
};

// Animación básica de física para emojis (colisiones simples)
function updateEmojis() {
    const emojiElements = document.querySelectorAll('.emoji');
    emojiElements.forEach(emoji => {
        const rect = emoji.getBoundingClientRect();
        const containerRect = emojiBackground.getBoundingClientRect();

        // Colisión con bordes
        if (rect.left <= containerRect.left || rect.right >= containerRect.right) {
            emoji.style.transform = emoji.style.transform.includes('scaleX(-1)') ? '' : 'scaleX(-1)';
        }
        if (rect.top <= containerRect.top) {
            emoji.style.top = '100%';
        }
    });
    requestAnimationFrame(updateEmojis);
}

updateEmojis();