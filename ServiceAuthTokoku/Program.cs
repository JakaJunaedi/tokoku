using System.Text;
using Database.AuthTokoku;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;
using ServiceAuthTokoku.Services;

// Inisialisasi Serilog Logger
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff}] [{Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: "logs/auth-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff}] [{Level:u3}] [{SourceContext}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateLogger();

try
{
    Log.Information("=== Memulai Startup ServiceAuthTokoku (Microservice Auth) ===");

    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog();

    // Add Controllers & OpenAPI
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddOpenApi();

    // Register DbContext khusus tokoku_user_db
    builder.Services.AddDbContext<TokokuUserDbContext>(options =>
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            b => b.MigrationsAssembly("Migration.AuthTokoku")));

    // Configure JWT Authentication
    var jwtKey = builder.Configuration["Jwt:Key"] ?? "TokokuSuperSecretJwtKey2026!MustBeAtLeast32BytesLong!";
    var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "TokokuAuthService";
    var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "TokokuClient";

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

    builder.Services.AddAuthorization();

    // Register Application Services
    builder.Services.AddSingleton<IPasswordHasherService, PasswordHasherService>();
    builder.Services.AddScoped<IJwtService, JwtService>();
    builder.Services.AddScoped<IAuthService, AuthService>();

    // CORS
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.WithOrigins("http://localhost:4200")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
    });

    var app = builder.Build();

    app.UseSerilogRequestLogging();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseCors("AllowFrontend");

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();

    // Health check endpoint
    app.MapGet("/health", () => Results.Ok(new
    {
        service = "ServiceAuthTokoku",
        status = "Healthy",
        database = "tokoku_user_db",
        timestamp = DateTime.UtcNow
    }));

    // Auto-seed initial superadmin
    try
    {
        await DatabaseSeeder.SeedDefaultSuperAdminAsync(app.Services);
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Seeding superadmin dilewati atau terjadi kesalahan: {Message}", ex.Message);
    }

    app.Run();
}
catch (Exception ex) when (ex.GetType().Name is not "HostAbortedException")
{
    Log.Fatal(ex, "Aplikasi ServiceAuthTokoku gagal memulai!");
}
finally
{
    Log.Information("Menutup dan membersihkan buffer logger...");
    Log.CloseAndFlush();
}
