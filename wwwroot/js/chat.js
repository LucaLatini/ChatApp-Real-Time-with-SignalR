
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub")
    .build();

// Elementi del DOM
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const messagesList = document.getElementById("messagesList");
const onlineUsersList = document.getElementById("onlineUsersList");

// Disabilita il form finché la connessione non è stabilita
sendButton.disabled = true;
messageInput.disabled = true;

// 1. ASCOLTATORE: Riceve un messaggio di chat
connection.on("ReceiveMessage", function (user, message) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${user}</strong>: ${message}`;
    messagesList.appendChild(li);
});

// 2. ASCOLTATORE: Riceve una notifica di sistema
connection.on("ReceiveNotification", function (message) {
    const li = document.createElement("li");
    li.textContent = message;
    li.className = "notification";
    messagesList.appendChild(li);
});

// 3. ASCOLTATORE: Riceve la lista aggiornata degli utenti online
connection.on("ReceiveUserList", function (users) {
    onlineUsersList.innerHTML = ""; // Pulisce la lista corrente
    users.forEach(user => {
        const li = document.createElement("li");
        li.textContent = user;
        onlineUsersList.appendChild(li);
    });
});


connection.start().then(function () {
    console.log("Connessione stabilita!");
    sendButton.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
}).catch(function (err) {
    // Se l'errore è 401, l'utente non è loggato
    console.error(err.toString());
    if (err.statusCode === 401) {
        alert("Devi effettuare il login per poter chattare.");
    }
});

/**
  * The message content entered by the user in the message input field.
  * @type {string}
  */
sendButton.addEventListener("click", function (event) {

    const message = messageInput.value;
    if (message) {
        // Non inviamo più il nome utente!
        connection.invoke("SendMessage", message).then(() => {
            messageInput.value = "";
            messageInput.focus();
        }).catch(err => console.error(err.toString()));
    }
    event.preventDefault();
});