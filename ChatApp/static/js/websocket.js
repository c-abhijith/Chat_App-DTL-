let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;

function connectWebSocket(roomName) {
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${wsScheme}://${window.location.host}/ws/${roomName}/`;
    
    console.log("Connecting to:", wsUrl);
    
    try {
        socket = new WebSocket(wsUrl);
        
        socket.onopen = function(e) {
            console.log("WebSocket connection established");
            reconnectAttempts = 0;
            // Send a test message
            socket.send(JSON.stringify({
                'type': 'ping'
            }));
        };
        
        socket.onclose = function(e) {
            console.log("WebSocket closed. Code:", e.code, "Reason:", e.reason);
            handleReconnection(roomName);
        };
        
        socket.onerror = function(e) {
            console.error("WebSocket error occurred");
        };
        
        socket.onmessage = function(e) {
            try {
                const data = JSON.parse(e.data);
                console.log("Received:", data);
                
                if (data.type === 'pong') {
                    console.log("Connection confirmed with pong");
                    return;
                }
                
                if (data.type === 'connection_established') {
                    console.log("Connection established to room:", data.room);
                    return;
                }
                
                updateChatUI(data);
            } catch (error) {
                console.error("Message processing error:", error);
            }
        };
    } catch (error) {
        console.error("WebSocket construction error:", error);
        handleReconnection(roomName);
    }
    
    return socket;
}

function handleReconnection(roomName) {
    if (reconnectAttempts < maxReconnectAttempts) {
        const timeout = 1000 * (reconnectAttempts + 1);
        console.log(`Reconnecting (${reconnectAttempts + 1}/${maxReconnectAttempts}) in ${timeout/1000}s`);
        
        setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket(roomName);
        }, timeout);
    } else {
        console.log("Max reconnection attempts reached");
        alert("Connection lost. Please refresh the page to reconnect.");
    }
}

function sendMessage(message, sender) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket not connected");
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
    