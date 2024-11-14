let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectWebSocket(roomName) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("WebSocket is already connected");
        return socket;
    }

    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = window.location.host;
    const wsUrl = `${wsScheme}://${wsHost}/ws/${roomName}/`;
    
    console.log("Connecting to WebSocket:", wsUrl);
    socket = new WebSocket(wsUrl);
    
    socket.onopen = function(e) {
        console.log("WebSocket connection established");
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    };
    
    socket.onclose = function(e) {
        console.log("WebSocket connection closed", e);
        
        if (reconnectAttempts < maxReconnectAttempts) {
            const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            console.log(`Attempting to reconnect in ${timeout/1000} seconds...`);
            
            setTimeout(() => {
                reconnectAttempts++;
                connectWebSocket(roomName);
            }, timeout);
        } else {
            console.log("Max reconnection attempts reached");
        }
    };
    
    socket.onerror = function(e) {
        console.error("WebSocket error occurred:", e);
    };
    
    socket.onmessage = function(e) {
        try {
            const data = JSON.parse(e.data);
            console.log("Received message:", data);
            // Handle the message here (e.g., update UI)
            updateChatUI(data);
        } catch (error) {
            console.error("Error processing message:", error);
        }
    };
    
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
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            'message': message,
            'sender': sender
        }));
        return true;
    } else {
        console.error("WebSocket is not connected");
        return false;
    }
} 