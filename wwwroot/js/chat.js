/**
 * Connessione SignalR verso l'Hub del server.
 * @type {signalR.HubConnection}
 */
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub")
    .build();

// --- Elementi del DOM ---
/** @type {HTMLInputElement|null} Campo di input per il messaggio */
const messageInput = document.getElementById("messageInput");
/** @type {HTMLButtonElement|null} Pulsante per inviare il messaggio */
const sendButton = document.getElementById("sendButton");
/** @type {HTMLUListElement|null} Lista DOM che contiene i messaggi della chat */
const messagesList = document.getElementById("messagesList");
/** @type {HTMLUListElement|null} Lista DOM che mostra gli utenti online */
const onlineUsersList = document.getElementById("onlineUsersList");
/** @type {HTMLInputElement|null} Campo di input per il nome della stanza */
const roomInput = document.getElementById("roomInput");
/** @type {HTMLButtonElement|null} Pulsante per effettuare il join nella stanza */
const joinRoomButton = document.getElementById("joinRoomButton");
/** @type {HTMLElement|null} Contenitore per la selezione della stanza */
const roomSelectionDiv = document.getElementById("room-selection");
/** @type {HTMLElement|null} Contenitore principale della chat */
const mainChatDiv = document.querySelector(".main-container");
/** @type {HTMLElement|null} Prompt per il login (mostrato se non autenticato) */
const loginPromptDiv = document.getElementById("login-prompt"); // Aggiunto riferimento al prompt di login

/**
 * Nome della stanza corrente.
 * @type {string}
 */
let currentRoom = ""; // Memorizza la stanza corrente

// --- Logica di Avvio e Connessione ---

// Avvia la connessione e gestisce la UI in base al risultato
connection.start().then(() => {
    // SUCCESSO: L'utente è autenticato.
    console.log("Connessione stabilita!");
    if (loginPromptDiv) loginPromptDiv.style.display = "none"; // Nasconde il prompt di login
    if (roomSelectionDiv) roomSelectionDiv.style.display = "block"; // Mostra la selezione della stanza
}).catch(err => {
    // FALLIMENTO: L'utente NON è autenticato.
    console.error(err.toString());
    if (err.statusCode === 401) {
        if (roomSelectionDiv) roomSelectionDiv.style.display = "none"; // Nasconde la selezione della stanza
        if (loginPromptDiv) loginPromptDiv.style.display = "block"; // Mostra il prompt per fare il login
    }
});

// Gestisce l'ingresso in una stanza
/**
 * Handler per il click sul pulsante di join stanza.
 * Precondizione: `roomInput`, `joinRoomButton` e `messagesList` esistono nel DOM.
 * Effetto: pulisce la lista messaggi, invia la richiesta al server e aggiorna la UI.
 */
if (joinRoomButton) {
    joinRoomButton.addEventListener("click", function () {
        const roomName = roomInput ? roomInput.value : "";
        if (roomName) {
            if (messagesList) messagesList.innerHTML = ""; // Pulisce i messaggi della stanza precedente

            connection.invoke("JoinRoom", roomName)
                .then(() => {
                    currentRoom = roomName;
                    // Nasconde la selezione della stanza e mostra la chat principale
                    if (roomSelectionDiv) roomSelectionDiv.style.display = "none";
                    if (mainChatDiv) mainChatDiv.classList.remove("hidden");
                    const title = document.querySelector(".chat-container h1");
                    if (title) title.textContent = `Chat in Tempo Reale - Stanza: ${currentRoom}`;
                })
                .catch(err => console.error(err.toString()));
        }
    });
}

// --- Gestione Invio Messaggi e Notifiche di Scrittura ---

// Timer per gestire la notifica "sta scrivendo"
/** @type {number|undefined} ID del timeout per la notifica di scrittura */
let typingTimer;

if (messageInput) {
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
}

// Gestione invio messaggi via pulsante
if (sendButton) {
    sendButton.addEventListener("click", function (event) {
        const message = messageInput ? messageInput.value : "";
        if (message && currentRoom) {
            // Quando invia, ferma subito il timer e la notifica "sta scrivendo"
            clearTimeout(typingTimer);
            connection.invoke("UserStoppedTyping", currentRoom).catch(err => console.error(err.toString()));

            connection.invoke("SendMessage", message, currentRoom).then(() => {
                if (messageInput) {
                    messageInput.value = "";
                    messageInput.focus();
                }
            }).catch(err => console.error(err.toString()));
        }
        event.preventDefault();
    });
}

// --- Ascoltatori di Eventi dall'Hub ---

// Riceve un messaggio di chat
/**
 * Handler per i messaggi di chat inviati dal server.
 * @param {string} user Nome dell'utente mittente
 * @param {string} message Testo del messaggio
 */
connection.on("ReceiveMessage", function (user, message) {
    appendMessage(`<strong>${user}</strong>: ${message}`);
});

// Riceve una notifica di sistema
/**
 * Handler per le notifiche di sistema (es. avvisi, info).
 * @param {string} message Testo della notifica
 */
connection.on("ReceiveNotification", function (message) {
    appendMessage(message, true);
});

// Riceve la lista aggiornata degli utenti online
/**
 * Aggiorna la lista degli utenti online nel DOM.
 * @param {string[]} users Array di nomi utente
 */
connection.on("ReceiveUserList", function (users) {
    if (!onlineUsersList) return;
    onlineUsersList.innerHTML = "";
    users.forEach(user => {
        const li = document.createElement("li");
        li.textContent = user;
        onlineUsersList.appendChild(li);
    });
});

// --- Funzione Helper ---

/**
 * Aggiunge un messaggio (o una notifica) alla lista dei messaggi.
 * @param {string} content HTML o testo del messaggio
 * @param {boolean} [isNotification=false] Se true, applica lo stile di notifica
 * @returns {void}
 */
function appendMessage(content, isNotification = false) {
    const li = document.createElement("li");
    if (isNotification) {
        li.textContent = content;
        li.className = "notification";
    } else {
        li.innerHTML = content;
    }
    if (messagesList) messagesList.appendChild(li);
}

// NUOVO ASCOLTATORE: Gestisce le notifiche "sta scrivendo"
/**
 * Set di utenti che attualmente stanno scrivendo (evita duplicati).
 * @type {Set<string>}
 */
const typingUsers = new Set(); // Usiamo un Set per evitare duplicati
/** @type {HTMLElement|null} Elemento DOM che mostra l'indicatore di scrittura */
const typingIndicator = document.getElementById("typing-indicator");

/**
 * Handler per le notifiche di scrittura inviate dal server.
 * @param {string} user Nome dell'utente che scrive
 * @param {boolean} isTyping Se true, l'utente ha iniziato a scrivere, altrimenti ha smesso
 */
connection.on("ReceiveTypingNotification", (user, isTyping) => {
    if (isTyping) {
        typingUsers.add(user); // Aggiunge l'utente alla lista di chi scrive
    } else {
        typingUsers.delete(user); // Rimuove l'utente
    }

    if (!typingIndicator) return;

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