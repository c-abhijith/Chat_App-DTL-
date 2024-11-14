let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectWebSocket(roomName) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        return socket;
    }

    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = window.location.host;
    const wsUrl = `${wsScheme}://${wsHost}/ws/${roomName}/`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = function(e) {
        console.log("Connected to WebSocket");
        reconnectAttempts = 0;
        heartbeat();
    };
    
    socket.onclose = function(e) {
        console.log("WebSocket closed:", e.code, e.reason);
        clearInterval(heartbeatInterval);
        
        if (reconnectAttempts < maxReconnectAttempts) {
            const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            console.log(`Reconnecting in ${timeout/1000} seconds...`);
            
            setTimeout(() => {
                reconnectAttempts++;
                socket = connectWebSocket(roomName);
            }, timeout);
        }
    };
    
    socket.onerror = function(e) {
        console.error("WebSocket error:", e);
    };
    
    socket.onmessage = function(e) {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'pong') {
                return;
            }
            updateChatUI(data);
        } catch (error) {
            console.error("Message error:", error);
        }
    };
    
    let heartbeatInterval;
    function heartbeat() {
        heartbeatInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }
    
    return socket;
}

function updateChatUI(data) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.innerHTML = `<strong>${data.sender}:</strong> ${data.message}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Function to send message
function sendMessage(message, sender) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket not connected");
        socket = connectWebSocket(roomName);
        return false;
    }
    
    try {
        socket.send(JSON.stringify({
            'type': 'message',
            'message': message,
            'sender': sender
        }));
        return true;
    } catch (error) {
        console.error("Send error:", error);
        return false;
    }
} 