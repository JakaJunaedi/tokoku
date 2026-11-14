using Database.Tokoku;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Events;
using ServiceTokoku.Services;

// Inisialisasi Serilog Logger Terstruktur
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff}] [{Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: "logs/tokoku-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff}] [{Level:u3}] [{SourceContext}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateLogger();

try
{
    Log.Information("=== Memulai Startup Aplikasi Backend Tokoku ===");

    var builder = WebApplication.CreateBuilder(args);

    // Mendaftarkan Serilog ke Host ASP.NET Core
    builder.Host.UseSerilog();

    // Add Controllers & Swagger/OpenAPI
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddOpenApi();

    // Register Application Services (Dependency Injection)
    builder.Services.AddScoped<IProductService, ProductService>();

    // CORS for Frontend Tokoku (Angular)
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.SetIsOriginAllowed(_ => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
    });

    // Database Context (PostgreSQL via Npgsql)
    builder.Services.AddDbContext<TokokuDbContext>(options =>
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            b => b.MigrationsAssembly("Migration.Tokoku")));

    var app = builder.Build();

    // Middleware Logging HTTP Request Detail
    app.UseSerilogRequestLogging(options =>
    {
        options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} merespons {StatusCode} dalam {Elapsed:0.0000} ms [IP: {ClientIp}]";
        options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
        {
            diagnosticContext.Set("ClientIp", httpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1");
            diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.ToString());
            diagnosticContext.Set("QueryString", httpContext.Request.QueryString.Value ?? string.Empty);
            diagnosticContext.Set("TraceIdentifier", httpContext.TraceIdentifier);
        };
    });

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseCors("AllowFrontend");

    if (!app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }

    // Health Check Endpoint
    app.MapGet("/health", () =>
    {
        Log.Information("Endpoint health-check diakses.");
        return Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow });
    });

    // Map Controller Routes
    app.MapControllers();

    Log.Information("Aplikasi siap menerima request pada konfigurasi port yang ditentukan.");
    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Aplikasi Backend Tokoku mengalami kegagalan saat startup.");
}
finally
{
    Log.Information("Menutup dan membersihkan buffer logger...");
    Log.CloseAndFlush();
}
