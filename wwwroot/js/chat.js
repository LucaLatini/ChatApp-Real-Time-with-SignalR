const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub")
    .build();

// --- Elementi del DOM ---
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const messagesList = document.getElementById("messagesList");
const onlineUsersList = document.getElementById("onlineUsersList");
const roomInput = document.getElementById("roomInput");
const joinRoomButton = document.getElementById("joinRoomButton");
const roomSelectionDiv = document.getElementById("room-selection");
const mainChatDiv = document.querySelector(".main-container");
const loginPromptDiv = document.getElementById("login-prompt");
const changeRoomButton = document.getElementById("changeRoomButton");
const typingIndicator = document.getElementById("typing-indicator");
const privateChatHeader = document.getElementById("private-chat-header");

// --- Variabili di Stato ---
let currentRoom = "";
let privateChatTarget = "";
let lastRoomName = ""; // <-- NUOVA VARIABILE PER RICORDARE L'ULTIMA STANZA
let typingTimer;
const typingUsers = new Set();

// --- Logica di Avvio e Connessione ---
connection.start().then(() => {
    console.log("Connessione stabilita!");
    loginPromptDiv.style.display = "none";
    roomSelectionDiv.style.display = "block";
}).catch(err => {
    console.error(err.toString());
    if (err.statusCode === 401) {
        roomSelectionDiv.style.display = "none";
        loginPromptDiv.style.display = "block";
    }
});

// --- Gestione Stanze e Chat Private ---

joinRoomButton.addEventListener("click", function () {
    const roomName = roomInput.value;
    if (roomName) {
        switchToRoom(roomName);
    }
});

changeRoomButton.addEventListener("click", function () {
    mainChatDiv.classList.add("hidden");
    roomSelectionDiv.style.display = "block";
    document.querySelector(".chat-container h1").textContent = "Chat in Tempo Reale";
});

onlineUsersList.addEventListener("click", function (event) {
    if (event.target && event.target.nodeName === "LI") {
        const targetUser = event.target.dataset.username;
        if (targetUser) {
            switchToPrivateChat(targetUser);
        }
    }
});

// --- Gestione Invio Messaggi ---
messageInput.addEventListener("input", () => {
    if (privateChatTarget || !currentRoom) return;
    connection.invoke("UserIsTyping", currentRoom).catch(err => console.error(err.toString()));
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        connection.invoke("UserStoppedTyping", currentRoom).catch(err => console.error(err.toString()));
    }, 1500);
});

sendButton.addEventListener("click", function (event) {
    event.preventDefault();
    const message = messageInput.value;
    if (!message) return;

    if (privateChatTarget) {
        connection.invoke("SendPrivateMessage", privateChatTarget, message)
            .catch(err => console.error(err.toString()));
    } else if (currentRoom) {
        clearTimeout(typingTimer);
        connection.invoke("UserStoppedTyping", currentRoom).catch(err => console.error(err.toString()));
        connection.invoke("SendMessage", message, currentRoom)
            .catch(err => console.error(err.toString()));
    }
    messageInput.value = "";
    messageInput.focus();
});

// --- Ascoltatori di Eventi dall'Hub ---
connection.on("ReceiveMessage", (user, message) => appendMessage(`<strong>${user}</strong>: ${message}`));
connection.on("ReceiveNotification", (message) => appendMessage(message, true));
connection.on("ReceiveUserList", updateUserList);
connection.on("ReceivePrivateMessage", (sender, message, isSender) => {
    const li = document.createElement("li");
    li.className = "private-message";
    if (isSender) {
        li.innerHTML = `<strong>Tu (a ${privateChatTarget})</strong>: ${message}`;
    } else {
        li.innerHTML = `<strong>${sender} (privato)</strong>: ${message}`;
    }
    messagesList.appendChild(li);
});
connection.on("ReceiveTypingNotification", (user, isTyping) => {
    if (isTyping) typingUsers.add(user); else typingUsers.delete(user);
    updateTypingIndicator();
});

// --- Funzioni Helper ---
function switchToRoom(roomName) {
    messagesList.innerHTML = "";
    privateChatTarget = "";
    privateChatHeader.style.display = "none";

    connection.invoke("JoinRoom", roomName).then(() => {
        currentRoom = roomName;
        lastRoomName = roomName; // <-- SALVIAMO IL NOME DELLA STANZA QUI
        roomSelectionDiv.style.display = "none";
        mainChatDiv.classList.remove("hidden");
        document.querySelector(".chat-container h1").textContent = `Chat - Stanza: ${currentRoom}`;
    }).catch(err => console.error(err.toString()));
}

function switchToPrivateChat(targetUser) {
    messagesList.innerHTML = "";
    privateChatTarget = targetUser;
    currentRoom = "";
    
    privateChatHeader.innerHTML = `Chat privata con <strong>${targetUser}</strong> <button id="backToRoom" class="btn-secondary">Torna alla stanza</button>`;
    privateChatHeader.style.display = "block";
    
    // CORREZIONE: Ora aggiungiamo l'evento qui, usando la variabile che abbiamo salvato
    document.getElementById("backToRoom").addEventListener("click", () => {
        if (lastRoomName) {
            switchToRoom(lastRoomName);
        }
    });

    roomSelectionDiv.style.display = "none";
    mainChatDiv.classList.remove("hidden");
    document.querySelector(".chat-container h1").textContent = `Chat Privata`;
}

function updateUserList(users) {
    onlineUsersList.innerHTML = "";
    users.forEach(user => {
        const li = document.createElement("li");
        li.textContent = user;
        li.dataset.username = user;
        onlineUsersList.appendChild(li);
    });
}

function updateTypingIndicator() {
    if (typingUsers.size === 0) typingIndicator.textContent = "";
    else if (typingUsers.size === 1) typingIndicator.textContent = `${Array.from(typingUsers)[0]} sta scrivendo...`;
    else if (typingUsers.size <= 3) typingIndicator.textContent = `${Array.from(typingUsers).join(', ')} stanno scrivendo...`;
    else typingIndicator.textContent = "Più utenti stanno scrivendo...";
}

function appendMessage(content, isNotification = false) {
    const li = document.createElement("li");
    if (isNotification) {
        li.className = "notification";
        li.textContent = content;
    } else {
        li.innerHTML = content;
    }
    messagesList.appendChild(li);
}