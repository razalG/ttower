const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { TikTokLiveConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Pune aici numele tău de utilizator de pe TikTok (fără @)
const tiktokUsername = "razal.g"; 
const tiktokLiveConnection = new TikTokLiveConnection(tiktokUsername, {});

tiktokLiveConnection.connect().then(state => {
    console.log(`Conectat cu succes la live-ul contului: ${state.roomId}`);
}).catch(err => {
    console.error('Eroare la conectarea TikTok Live:', err);
});

// Ascultă cadourile în timp real
tiktokLiveConnection.on('gift', data => {
    if (data.giftType === 1 && !data.repeatEnd) {
        io.emit('gameAction', {
            type: data.giftName.toUpperCase().includes('ROSE') ? 'ROSE' : 'GIFT',
            user: data.uniqueId,
            avatar: data.profilePictureUrl
        });
    } else if (data.giftType !== 1) {
        io.emit('gameAction', {
            type: 'ROSE',
            user: data.uniqueId,
            avatar: data.profilePictureUrl
        });
    }
});

// Ascultă urmăritorii (Follow)
tiktokLiveConnection.on('social', data => {
    if (data.displayType === 'pm_or_social_follow') {
        io.emit('gameAction', {
            type: 'FOLLOW',
            user: data.uniqueId,
            avatar: data.profilePictureUrl
        });
    }
});

// Ascultă tap-urile (aprecierile pe ecran)
let tapAccumulator = 0;
tiktokLiveConnection.on('like', data => {
    tapAccumulator += data.likeCount;
    if (tapAccumulator >= 50) {
        tapAccumulator = 0;
        io.emit('gameAction', {
            type: 'TAP',
            user: data.uniqueId,
            avatar: data.profilePictureUrl
        });
    }
});

io.on('connection', (socket) => {
    console.log('Un vizualizator s-a conectat la joc.');

    // Simulator de test pentru OBS / Local
    socket.on('testAction', (type) => {
        let testUser = type === 'SABOTAGE' ? "TrollUser" : "Andrei_Dev";
        let testAvatar = "https://i.imgur.com/8Kt92wv.png";
        
        io.emit('gameAction', {
            type: type,
            user: testUser,
            avatar: testAvatar
        });
    });
});

server.listen(3000, () => {
    console.log('Serverul rulează pe http://localhost:3000');
});