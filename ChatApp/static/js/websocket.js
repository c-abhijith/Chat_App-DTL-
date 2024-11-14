let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let heartbeatInterval;
let roomNameGlobal;

function connectWebSocket(roomName) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected");
        return socket;
    }

    roomNameGlobal = roomName;
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = window.location.host;
    const wsUrl = `${wsScheme}://${wsHost}/ws/${roomName}/`;
    
    console.log("Attempting WebSocket connection to:", wsUrl);
    
    try {
        socket = new WebSocket(wsUrl);
    } catch (error) {
        console.error("WebSocket construction error:", error);
        handleReconnection();
        return null;
    }
    
    socket.onopen = function(e) {
        console.log("WebSocket connection established");
        reconnectAttempts = 0;
        startHeartbeat();
    };
    
    socket.onclose = function(e) {
        console.log("WebSocket closed:", e.code, e.reason);
        stopHeartbeat();
        handleReconnection();
    };
    
    socket.onerror = function(e) {
        console.error("WebSocket error occurred:", e);
        if (socket.readyState === WebSocket.OPEN) {
            socket.close();
        }
    };
    
    socket.onmessage = function(e) {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'pong') {
                return;
            }
            updateChatUI(data);
        } catch (error) {
            console.error("Message processing error:", error);
        }
    };
    
    return socket;
}

function handleReconnection() {
    if (reconnectAttempts < maxReconnectAttempts) {
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        console.log(`Attempting reconnection ${reconnectAttempts + 1}/${maxReconnectAttempts} in ${timeout/1000} seconds`);
        
        setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket(roomNameGlobal);
        }, timeout);
    } else {
        console.log("Max reconnection attempts reached. Please refresh the page.");
        alert("Connection lost. Please refresh the page to reconnect.");
    }
}

function startHeartbeat() {
    stopHeartbeat();
    heartbeatInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            try {
                socket.send(JSON.stringify({ type: 'ping' }));
            } catch (error) {
                console.error("Heartbeat error:", error);
                socket.close();
            }
        }
    }, 30000);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

function sendMessage(message, sender) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket not connected");
        alert("Connection lost. Attempting to reconnect...");
        connectWebSocket(roomNameGlobal);
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
        socket.close();
        return false;
    }
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

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.close();
    }
    stopHeartbeat();
});
    