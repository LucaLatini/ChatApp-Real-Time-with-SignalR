using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

[Authorize] // L'accesso è consentito solo agli utenti autenticati
/// <summary>
/// Hub SignalR per la chat
/// </summary>
public class ChatHub : Hub
{
    // La nostra "memoria" per gli utenti online (rimane invariata)
    private static ConcurrentDictionary<string, string> ConnectedUsers = new();


    /// <summary>
    /// Eseguito quando un utente si connette
    /// </summary>
    /// <returns></returns>
    public override async Task OnConnectedAsync()
    {
        // il nome utente dal contesto di autenticazione
        var username = Context.User.Identity?.Name ?? "Utente Sconosciuto";

        // aggiungo l'utente alla lista e lo notifichiamo a tutti
        ConnectedUsers[Context.ConnectionId] = username;
        await Clients.All.SendAsync("ReceiveNotification", $"{username} si è unito alla chat.");
        await UpdateUserList();

        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Eseguito quando un utente si disconnette
    /// </summary>
    /// <param name="exception"></param>
    /// <returns></returns>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (ConnectedUsers.TryRemove(Context.ConnectionId, out string? username))
        {
            await Clients.All.SendAsync("ReceiveNotification", $"{username} ha lasciato la chat.");
            await UpdateUserList();
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Metodo chiamato dai client per inviare un messaggio
    /// </summary>
    /// <param name="message"></param>
    /// <returns></returns>
    public async Task SendMessage(string message)
    {
        var username = Context.User.Identity?.Name ?? "Utente Sconosciuto";
        await Clients.All.SendAsync("ReceiveMessage", username, message);
    }

    /// <summary>
    /// Aggiorna la lista degli utenti connessi per tutti i client
    /// </summary>
    /// <returns></returns>
    private async Task UpdateUserList()
    {
        var users = ConnectedUsers.Values.ToList();
        await Clients.All.SendAsync("ReceiveUserList", users);
    }
}