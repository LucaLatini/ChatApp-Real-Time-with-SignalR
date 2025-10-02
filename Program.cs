
using ChatAppServer.Data; 
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Usa la nostra nuova classe ApplicationDbContext
var connectionString = "Data Source=app.db";
builder.Services.AddDbContext<ApplicationDbContext>(options => 
    options.UseSqlite(connectionString));

// Ora AddDefaultIdentity funzionerà e userà il nostro DbContext
builder.Services.AddDefaultIdentity<IdentityUser>(options => {
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequiredLength = 3;
})
.AddEntityFrameworkStores<ApplicationDbContext>(); 

builder.Services.AddSignalR();
builder.Services.AddRazorPages();

var app = builder.Build();

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapRazorPages();
app.MapHub<ChatHub>("/chatHub");
app.MapFallbackToFile("index.html");

app.Run();