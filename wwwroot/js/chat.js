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
const loginPromptDiv = document.getElementById("login-prompt"); // Aggiunto riferimento al prompt di login

let currentRoom = ""; // Memorizza la stanza corrente

// --- Logica di Avvio e Connessione ---

// Avvia la connessione e gestisce la UI in base al risultato
connection.start().then(() => {
    // SUCCESSO: L'utente è autenticato.
    console.log("Connessione stabilita!");
    loginPromptDiv.style.display = "none"; // Nasconde il prompt di login
    roomSelectionDiv.style.display = "block"; // Mostra la selezione della stanza
}).catch(err => {
    // FALLIMENTO: L'utente NON è autenticato.
    console.error(err.toString());
    if (err.statusCode === 401) {
        roomSelectionDiv.style.display = "none"; // Nasconde la selezione della stanza
        loginPromptDiv.style.display = "block"; // Mostra il prompt per fare il login
    }
});

// Gestisce l'ingresso in una stanza
joinRoomButton.addEventListener("click", function () {
    const roomName = roomInput.value;
    if (roomName) {
        messagesList.innerHTML = ""; // Pulisce i messaggi della stanza precedente

        connection.invoke("JoinRoom", roomName)
            .then(() => {
                currentRoom = roomName;
                // Nasconde la selezione della stanza e mostra la chat principale
                roomSelectionDiv.style.display = "none";
                mainChatDiv.classList.remove("hidden");
                document.querySelector(".chat-container h1").textContent = `Chat in Tempo Reale - Stanza: ${currentRoom}`;
            })
            .catch(err => console.error(err.toString()));
    }
});

// --- Gestione Invio Messaggi e Notifiche di Scrittura ---

// Timer per gestire la notifica "sta scrivendo"
let typingTimer;

messageInput.addEventListener("input", () => {
    // L'utente sta scrivendo: invia la notifica
    connection.invoke("UserIsTyping", currentRoom).catch(err => console.error(err.toString()));

    // Resetta il timer ogni volta che l'utente preme un tasto
    clearTimeout(typingTimer);

    // Imposta un nuovo timer: se l'utente non scrive per 1.5 secondi, invia "ha smesso"
    typingTimer = setTimeout(() => {
        connection.invoke("UserStoppedTyping", currentRoom).catch(err => console.error(err.toString()));
    }, 1500); // 1.5 secondi
});


sendButton.addEventListener("click", function (event) {
    const message = messageInput.value;
    if (message && currentRoom) {
        // Quando invia, ferma subito il timer e la notifica "sta scrivendo"
        clearTimeout(typingTimer);
        connection.invoke("UserStoppedTyping", currentRoom).catch(err => console.error(err.toString()));

        connection.invoke("SendMessage", message, currentRoom).then(() => {
            messageInput.value = "";
            messageInput.focus();
        }).catch(err => console.error(err.toString()));
    }
    event.preventDefault();
});

// --- Ascoltatori di Eventi dall'Hub ---

// Riceve un messaggio di chat
connection.on("ReceiveMessage", function (user, message) {
    appendMessage(`<strong>${user}</strong>: ${message}`);
});

// Riceve una notifica di sistema
connection.on("ReceiveNotification", function (message) {
    appendMessage(message, true);
});

// Riceve la lista aggiornata degli utenti online
connection.on("ReceiveUserList", function (users) {
    onlineUsersList.innerHTML = "";
    users.forEach(user => {
        const li = document.createElement("li");
        li.textContent = user;
        onlineUsersList.appendChild(li);
    });
});

// --- Funzione Helper ---

function appendMessage(content, isNotification = false) {
    const li = document.createElement("li");
    if (isNotification) {
        li.textContent = content;
        li.className = "notification";
    } else {
        li.innerHTML = content;
    }
    messagesList.appendChild(li);
}

// ... codice precedente ...

// NUOVO ASCOLTATORE: Gestisce le notifiche "sta scrivendo"
const typingUsers = new Set(); // Usiamo un Set per evitare duplicati
const typingIndicator = document.getElementById("typing-indicator");

connection.on("ReceiveTypingNotification", (user, isTyping) => {
    if (isTyping) {
        typingUsers.add(user); // Aggiunge l'utente alla lista di chi scrive
    } else {
        typingUsers.delete(user); // Rimuove l'utente
    }

    if (typingUsers.size === 0) {
        typingIndicator.textContent = "";
    } else if (typingUsers.size === 1) {
        typingIndicator.textContent = `${Array.from(typingUsers)[0]} sta scrivendo...`;
    } else if (typingUsers.size <= 3) {
        typingIndicator.textContent = `${Array.from(typingUsers).join(', ')} stanno scrivendo...`;
    } else {
        typingIndicator.textContent = "Più utenti stanno scrivendo...";
    }
});

// ... resto del codice (funzione appendMessage) ...