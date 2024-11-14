let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;

function connectWebSocket(roomName) {
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${wsScheme}://${window.location.host}/ws/${roomName}/`;
    
    console.log("Connecting to:", wsUrl);
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = function(e) {
        console.log("Connected!");
        reconnectAttempts = 0;
    };
    
    socket.onclose = function(e) {
        console.log("Disconnected. Code:", e.code, "Reason:", e.reason);
        handleReconnection(roomName);
    };
    
    socket.onerror = function(e) {
        console.error("WebSocket error:", e);
    };
    
    socket.onmessage = function(e) {
        try {
            const data = JSON.parse(e.data);
            updateChatUI(data);
        } catch (error) {
            console.error("Message error:", error);
        }
    };
    
    return socket;
}

function handleReconnection(roomName) {
    if (reconnectAttempts < maxReconnectAttempts) {
        const timeout = 1000 * (reconnectAttempts + 1);
        console.log(`Reconnecting in ${timeout/1000} seconds...`);
        
        setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket(roomName);
        }, timeout);
    } else {
        console.log("Max reconnection attempts reached");
        alert("Connection lost. Please refresh the page.");
    }
}

function sendMessage(message, sender) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            'message': message,
            'sender': sender
        }));
        return true;
    }
    return false;
}

function updateChatUI(data) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages && data.message && data.sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.innerHTML = `<strong>${data.sender}:</strong> ${data.message}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.close();
    }
});
    