using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;

/// <summary>
/// Hub SignalR per la chat in tempo reale.
/// Gestisce la connessione degli utenti, l'assegnazione alle stanze (gruppi)
/// e le notifiche (messaggi, lista utenti, typing indicator).
/// </summary>
[Authorize]
public class ChatHub : Hub
{
    /// <summary>
    /// Mappa connectionId -> username per tutti gli utenti connessi.
    /// Il valore è sempre una stringa non nulla (GetUsername garantisce un fallback).
    /// </summary>
    private static ConcurrentDictionary<string, string> ConnectedUsers = new();

    /// <summary>
    /// Mappa connectionId -> roomName. Il valore può essere null quando non è ancora assegnata.
    /// Usando string? evitiamo warning relativi ai nullable reference types.
    /// </summary>
    private static ConcurrentDictionary<string, string?> UserRooms = new();

    /// <summary>
    /// Permette ad un client di unirsi a una stanza (gruppo SignalR).
    /// Rimuove l'utente dalla stanza precedente (se presente) e notifica la nuova stanza.
    /// </summary>
    /// <param name="roomName">Nome della stanza da joinare</param>
    /// <returns>Task asincrono</returns>
    public async Task JoinRoom(string roomName)
    {
        var username = GetUsername();

        // Se l'utente era già in un'altra stanza, lo rimuoviamo da lì
        if (UserRooms.TryGetValue(Context.ConnectionId, out string? oldRoom) && !string.IsNullOrEmpty(oldRoom))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, oldRoom);
            await Clients.Group(oldRoom).SendAsync("ReceiveNotification", $"{username} ha lasciato la stanza.");
        }

        // Aggiungiamo l'utente al nuovo gruppo (stanza)
        await Groups.AddToGroupAsync(Context.ConnectionId, roomName);
        UserRooms[Context.ConnectionId] = roomName; // Memorizziamo la stanza corrente dell'utente

        // Inviamo una notifica solo agli utenti nella nuova stanza
        await Clients.Group(roomName).SendAsync("ReceiveNotification", $"{username} si è unito alla stanza '{roomName}'.");

        // Aggiorniamo la lista utenti per tutti (potrebbe essere ottimizzato)
        await UpdateUserList();
    }

    /// <summary>
    /// Invia un messaggio ad una stanza specifica.
    /// </summary>
    /// <param name="message">Testo del messaggio</param>
    /// <param name="roomName">Nome della stanza</param>
    /// <returns>Task asincrono</returns>
    public async Task SendMessage(string message, string roomName)
    {
        var username = GetUsername();
        // Invia il messaggio solo al gruppo specificato
        await Clients.Group(roomName).SendAsync("ReceiveMessage", username, message);
    }

    // --- Metodi del ciclo di vita (OnConnected/OnDisconnected) ---

    /// <inheritdoc />
    public override async Task OnConnectedAsync()
    {
        var username = GetUsername();
        ConnectedUsers[Context.ConnectionId] = username;
        // La notifica di join ora avviene quando si entra in una stanza, non qui
        await UpdateUserList();
        await base.OnConnectedAsync();
    }

    /// <inheritdoc />
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Rimuoviamo l'utente dalla lista generale
        ConnectedUsers.TryRemove(Context.ConnectionId, out _);

        // Se l'utente era in una stanza, lo notifichiamo a quella stanza
        if (UserRooms.TryRemove(Context.ConnectionId, out string? roomName) && !string.IsNullOrEmpty(roomName))
        {
            var username = GetUsername();
            await Clients.Group(roomName).SendAsync("ReceiveNotification", $"{username} ha lasciato la chat.");
        }

        await UpdateUserList();
        await base.OnDisconnectedAsync(exception);
    }

    // --- Metodi Helper ---

    /// <summary>
    /// Restituisce il nome utente estratto dal contesto di autenticazione.
    /// Se non è presente un nome, ritorna un valore di fallback "Utente Sconosciuto".
    /// </summary>
    /// <returns>Nome utente non-null</returns>
    private string GetUsername()
    {
        // Uso operatori null-safe per evitare dereference di valori null
        var name = Context?.User?.Identity?.Name;
        return string.IsNullOrEmpty(name) ? "Utente Sconosciuto" : name!;
    }

    /// <summary>
    /// Invia la lista aggiornata degli utenti connessi a tutti i client.
    /// </summary>
    /// <returns>Task asincrono</returns>
    private async Task UpdateUserList()
    {
        var users = ConnectedUsers.Values.ToList();
        // Invia la lista a tutti, indistintamente dalla stanza
        await Clients.All.SendAsync("ReceiveUserList", users);
    }

    /// <summary>
    /// Notifica agli altri client nella stessa stanza che l'utente ha iniziato a scrivere.
    /// </summary>
    /// <param name="roomName">Nome della stanza</param>
    /// <returns>Task asincrono</returns>
    public async Task UserIsTyping(string roomName)
    {
        var username = GetUsername();
        // Invia la notifica a TUTTI GLI ALTRI nella stessa stanza
        await Clients.Group(roomName).SendAsync("ReceiveTypingNotification", username, true);
    }

    /// <summary>
    /// Notifica agli altri client nella stessa stanza che l'utente ha smesso di scrivere.
    /// </summary>
    /// <param name="roomName">Nome della stanza</param>
    /// <returns>Task asincrono</returns>
    public async Task UserStoppedTyping(string roomName)
    {
        var username = GetUsername();
        // Invia la notifica a TUTTI GLI ALTRI nella stessa stanza
        await Clients.Group(roomName).SendAsync("ReceiveTypingNotification", username, false);
    }
    
    // Inserisci questo codice dentro la classe ChatHub

    /// <summary>
    /// Invia un messaggio privato a un utente specifico.
    /// Il messaggio viene inviato solo se il destinatario è online.
    /// </summary>
    /// <param name="recipientUsername">Nome utente del destinatario</param>
    /// <param name="message">Testo del messaggio</param>
    /// <returns>Task asincrono</returns>
public async Task SendPrivateMessage(string recipientUsername, string message)
{
    var senderUsername = GetUsername();

    // Trova l'ID di connessione del destinatario
    // Usiamo FirstOrDefault per trovare la prima corrispondenza nel dizionario
    var recipientConnectionId = ConnectedUsers
        .FirstOrDefault(x => x.Value == recipientUsername).Key;

    if (recipientConnectionId != null)
    {
        // Invia il messaggio al destinatario specifico
        await Clients.Client(recipientConnectionId)
            .SendAsync("ReceivePrivateMessage", senderUsername, message);
            
        // Invia una copia del messaggio anche al mittente, per la sua UI
        await Clients.Caller
            .SendAsync("ReceivePrivateMessage", senderUsername, message, true); // Aggiungiamo un flag per identificarlo
    }
}
}