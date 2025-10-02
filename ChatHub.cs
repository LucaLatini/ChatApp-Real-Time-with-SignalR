using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

[Authorize] // L'accesso è consentito solo agli utenti autenticati
public class ChatHub : Hub
{
    // La nostra "memoria" per gli utenti online (rimane invariata)
    private static ConcurrentDictionary<string, string> ConnectedUsers = new();

    // MODIFICATO: Eseguito quando un utente AUTENTICATO si connette
    public override async Task OnConnectedAsync()
    {
        // Otteniamo il nome utente dal contesto di autenticazione
        var username = Context.User.Identity?.Name ?? "Utente Sconosciuto";

        // Aggiungiamo l'utente alla lista e lo notifichiamo a tutti
        ConnectedUsers[Context.ConnectionId] = username;
        await Clients.All.SendAsync("ReceiveNotification", $"{username} si è unito alla chat.");
        await UpdateUserList();

        await base.OnConnectedAsync();
    }

    // MODIFICATO: Eseguito quando un utente si disconnette
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (ConnectedUsers.TryRemove(Context.ConnectionId, out string? username))
        {
            await Clients.All.SendAsync("ReceiveNotification", $"{username} ha lasciato la chat.");
            await UpdateUserList();
        }

        await base.OnDisconnectedAsync(exception);
    }

    // SEMPLIFICATO: Il metodo non riceve più 'user', lo prende dal contesto
    public async Task SendMessage(string message)
    {
        var username = Context.User.Identity?.Name ?? "Utente Sconosciuto";
        await Clients.All.SendAsync("ReceiveMessage", username, message);
    }

    // Metodo helper per inviare la lista di utenti (rimane invariato)
    private async Task UpdateUserList()
    {
        var users = ConnectedUsers.Values.ToList();
        await Clients.All.SendAsync("ReceiveUserList", users);
    }
}