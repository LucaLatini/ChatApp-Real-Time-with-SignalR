using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

[Authorize]
public class ChatHub : Hub
{
    // Manteniamo la lista degli utenti connessi
    private static ConcurrentDictionary<string, string> ConnectedUsers = new();

    // NUOVO: "Memoria" per sapere in quale stanza si trova ogni utente
    private static ConcurrentDictionary<string, string> UserRooms = new();

    // NUOVO: Metodo per permettere a un utente di unirsi a una stanza
    public async Task JoinRoom(string roomName)
    {
        var username = GetUsername();

        // Se l'utente era già in un'altra stanza, lo rimuoviamo da lì
        if (UserRooms.TryGetValue(Context.ConnectionId, out string oldRoom))
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

    // MODIFICATO: Ora il metodo accetta anche il nome della stanza
    public async Task SendMessage(string message, string roomName)
    {
        var username = GetUsername();
        // Invia il messaggio solo al gruppo specificato
        await Clients.Group(roomName).SendAsync("ReceiveMessage", username, message);
    }

    // --- Metodi del ciclo di vita (OnConnected/OnDisconnected) ---

    public override async Task OnConnectedAsync()
    {
        var username = GetUsername();
        ConnectedUsers[Context.ConnectionId] = username;
        // La notifica di join ora avviene quando si entra in una stanza, non qui
        await UpdateUserList();
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Rimuoviamo l'utente dalla lista generale
        ConnectedUsers.TryRemove(Context.ConnectionId, out _);

        // Se l'utente era in una stanza, lo notifichiamo a quella stanza
        if (UserRooms.TryRemove(Context.ConnectionId, out string roomName))
        {
            var username = GetUsername();
            await Clients.Group(roomName).SendAsync("ReceiveNotification", $"{username} ha lasciato la chat.");
        }

        await UpdateUserList();
        await base.OnDisconnectedAsync(exception);
    }

    // --- Metodi Helper ---

    private string GetUsername()
    {
        return Context.User.Identity?.Name ?? "Utente Sconosciuto";
    }

    private async Task UpdateUserList()
    {
        var users = ConnectedUsers.Values.ToList();
        // Invia la lista a tutti, indistintamente dalla stanza
        await Clients.All.SendAsync("ReceiveUserList", users);
    }

    // Inserisci questo codice dentro la classe ChatHub

    // NUOVO: Metodo per notificare che l'utente sta scrivendo
    public async Task UserIsTyping(string roomName)
    {
        var username = GetUsername();
        // Invia la notifica a TUTTI GLI ALTRI nella stessa stanza
        await Clients.Group(roomName).SendAsync("ReceiveTypingNotification", username, true);
    }

    // NUOVO: Metodo per notificare che l'utente ha smesso di scrivere
    public async Task UserStoppedTyping(string roomName)
    {
        var username = GetUsername();
        // Invia la notifica a TUTTI GLI ALTRI nella stessa stanza
        await Clients.Group(roomName).SendAsync("ReceiveTypingNotification", username, false);
    }
}