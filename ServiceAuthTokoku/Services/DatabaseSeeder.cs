using Database.AuthTokoku;
using Microsoft.EntityFrameworkCore;
using Model.AuthTokoku;

namespace ServiceAuthTokoku.Services;

public static class DatabaseSeeder
{
    public static async Task SeedDefaultSuperAdminAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TokokuUserDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasherService>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseSeeder");

        var hasSuperAdmin = await dbContext.Users.AnyAsync(u => u.Role == "SuperAdmin");
        if (!hasSuperAdmin)
        {
            var defaultEmail = configuration["SuperAdminSeed:Email"] ?? "superadmin@tokoku.com";
            var defaultPassword = configuration["SuperAdminSeed:Password"] ?? "SuperAdmin123!";
            var defaultName = configuration["SuperAdminSeed:FullName"] ?? "Tokoku Super Admin";

            var superAdmin = new User
            {
                FullName = defaultName,
                Email = defaultEmail.ToLowerInvariant(),
                PasswordHash = passwordHasher.HashPassword(defaultPassword),
                Role = "SuperAdmin",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            dbContext.Users.Add(superAdmin);
            await dbContext.SaveChangesAsync();

            logger.LogInformation("Initial Superadmin berhasil dibuat: {Email}", superAdmin.Email);
        }
    }
}
