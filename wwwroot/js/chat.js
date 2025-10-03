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


// --- Gestione Invio Messaggi ---

sendButton.addEventListener("click", function (event) {
    const message = messageInput.value;
    if (message && currentRoom) {
        // Invia il messaggio e la stanza corrente al server
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