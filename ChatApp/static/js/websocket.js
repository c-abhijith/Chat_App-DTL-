function connectWebSocket(roomName) {
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = window.location.host;
    const wsUrl = `${wsScheme}://${wsHost}/ws/${roomName}/`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = function(e) {
        console.log("WebSocket connection established");
    };
    
    socket.onclose = function(e) {
        console.log("WebSocket connection closed", e);
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
            console.log("Attempting to reconnect...");
            connectWebSocket(roomName);
        }, 3000);
    };
    
    socket.onerror = function(e) {
        console.error("WebSocket error:", e);
    };
    
    socket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        // Handle incoming messages here
        console.log("Received message:", data);
    };
    
    return socket;
} 