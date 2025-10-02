# ChatApp Real-Time con SignalR

Una semplice ma completa applicazione di chat in tempo reale costruita con ASP.NET Core e SignalR. Questo progetto, sviluppato passo dopo passo, dimostra i concetti fondamentali della comunicazione bidirezionale web, la gestione sicura degli utenti con ASP.NET Core Identity e la sincronizzazione dello stato in tempo reale tra più client.

## ✨ Funzionalità

- **💬 Messaggistica Istantanea**: Invia e ricevi messaggi in tempo reale senza dover ricaricare la pagina.
- **🔐 Autenticazione Utenti**: Sistema di registrazione e login sicuro basato su ASP.NET Core Identity. Solo gli utenti autenticati possono accedere alla chat.
- **👋 Notifiche di Connessione/Disconnessione**: Ricevi notifiche automatiche quando un utente si unisce o lascia la chat.
- **👥 Lista Utenti Online in Tempo Reale**: Visualizza una lista sempre aggiornata di tutti gli utenti attualmente connessi alla chat.

## 🛠️ Tecnologie Utilizzate

### Backend
- C#
- ASP.NET Core
- SignalR
- Entity Framework Core
- ASP.NET Core Identity

### Database
- SQLite (leggero e basato su file)

### Frontend
- HTML5
- CSS3
- JavaScript (vanilla)

## 🚀 Installazione e Avvio

Per eseguire questo progetto in locale, segui questi passaggi.

### Prerequisiti
- .NET 8 SDK o superiore

### Passaggi

1. **Clona il repository** (o scarica lo ZIP):
   ```bash
   git clone https://github.com/tuo-utente/tuo-progetto.git
   cd ChatAppServer
2. **Crea il database:**
3. ```bash
   dotnet ef database update
4. **Avvia l'applicazione**
5. ```bash
   dotnet run
6. **Apri il browser**
   Naviga all'indirizzo fornito nel terminale (es. https://localhost:7123).
## 🎮 Come Utilizzare l'Applicazione

1. **Apri l'applicazione** nel browser all'indirizzo indicato dopo l'avvio
2. **Registrati** cliccando sul pulsante "Registrati" per creare un nuovo account
3. **Effettua il Login** con le credenziali appena create
4. **Accedi alla Chat** - una volta autenticato, la chat si attiverà automaticamente e sarai connesso
5. **Testa la Comunicazione Real-Time**:
   - Apri un'altra finestra del browser (in modalità incognito o con un altro browser)
   - Crea un secondo account utente
   - Invia messaggi da entrambi gli account per vedere la sincronizzazione in tempo reale

## 🧠 Concetti Chiave Appresi in questo Progetto

### 🔄 Comunicazione Bidirezionale
- Comprensione profonda di come SignalR astrae i WebSockets
- Implementazione di comunicazione RPC (Remote Procedure Call) tra server e client
- Gestione degli eventi real-time lato client e server

### 🖥️ Gestione dello Stato sul Server
- Utilizzo di `ConcurrentDictionary` statico per mantenere una lista di utenti connessi
- Approccio thread-safe per la gestione delle connessioni simultanee
- Sincronizzazione dello stato tra multiple istanze client

### 🔒 Integrazione con ASP.NET Core Identity
- Protezione di un Hub SignalR con l'attributo `[Authorize]`
- Accesso alle informazioni dell'utente autenticato tramite `Context.User`
- Gestione sicura delle sessioni e autenticazione real-time

### 🗄️ Entity Framework Core (Code-First)
- Utilizzo delle migrazioni per creare e aggiornare lo schema del database
- Approccio code-first per la definizione dei modelli dati
- Integrazione con database SQLite

### 🐛 Debugging Frontend
- Risoluzione problemi legati alla cache del browser
- Gestione errori JavaScript comuni (es: `TypeError: Cannot read properties of null`)
- Ottimizzazione del caricamento degli script e dipendenze