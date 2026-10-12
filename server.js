const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { TikTokLiveConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Numele tău de utilizator TikTok (fără @)
const tiktokUsername = "razal.g"; 
const tiktokLiveConnection = new TikTokLiveConnection(tiktokUsername, {});

// Conectare cu reîncercare automată
function connectToTikTok() {
    tiktokLiveConnection.connect().then(state => {
        console.log(`Conectat cu succes la live-ul contului: ${state.roomId}`);
    }).catch(err => {
        console.log('User offline sau eroare. Se reîncearcă în 10 secunde...');
        setTimeout(connectToTikTok, 10000);
    });
}

connectToTikTok();

// Ascultă cadourile (Gifts)
tiktokLiveConnection.on('gift', data => {
    let username = data.uniqueId || (data.user && data.user.uniqueId) || "Anonim";
    let avatar = data.profilePictureUrl || (data.user && data.user.profilePictureUrl) || "https://i.imgur.com/8Kt92wv.png";
    let giftName = data.giftName || "Gift";

    console.log(`[GIFT] ${username} a trimis: ${giftName}`);

    if (data.giftType === 1 && !data.repeatEnd) {
        io.emit('gameAction', {
            type: giftName.toUpperCase().includes('ROSE') ? 'ROSE' : 'GIFT',
            user: username,
            avatar: avatar
        });
    } else if (data.giftType !== 1) {
        io.emit('gameAction', {
            type: 'ROSE',
            user: username,
            avatar: avatar
        });
    }
});

// Ascultă următori (Follow)
tiktokLiveConnection.on('social', data => {
    let username = data.uniqueId || (data.user && data.user.uniqueId) || "Anonim";
    let avatar = data.profilePictureUrl || (data.user && data.user.profilePictureUrl) || "https://i.imgur.com/8Kt92wv.png";

    // Verifică orice tip de interacțiune socială de tip follow
    if (data.displayType === 'pm_or_social_follow' || (data.label && data.label.includes('follow'))) {
        console.log(`[FOLLOW] ${username} te-a urmărit!`);
        io.emit('gameAction', {
            type: 'FOLLOW',
            user: username,
            avatar: avatar
        });
    }
});

// Ascultă tap-urile / aprecierile (Like)
let tapAccumulator = 0;
tiktokLiveConnection.on('like', data => {
    let username = data.uniqueId || (data.user && data.user.uniqueId) || "Anonim";
    let avatar = data.profilePictureUrl || (data.user && data.user.profilePictureUrl) || "https://i.imgur.com/8Kt92wv.png";
    
    // Preluare număr de like-uri din orice structură
    let count = Number(data.likeCount) || Number(data.stepCount) || 1;

    tapAccumulator += count;
    console.log(`[LIKE] ${username} a trimis ${count} aprecieri. Total acumulat: ${tapAccumulator}/10`);

    // Declanșăm acțiunea la fiecare 10 tap-uri acumulate
    if (tapAccumulator >= 10) {
        tapAccumulator = 0;
        io.emit('gameAction', {
            type: 'TAP',
            user: username,
            avatar: avatar
        });
    }
});

io.on('connection', (socket) => {
    console.log('Un vizualizator s-a conectat la joc.');

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
    console.log('Serverul rulează pe portul 3000');
});
