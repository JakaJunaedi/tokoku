using System.Security.Cryptography;
using Database.AuthTokoku;
using Microsoft.EntityFrameworkCore;
using Model.AuthTokoku;
using Model.AuthTokoku.DTOs;

namespace ServiceAuthTokoku.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<string> RequestPasswordResetAsync(ResetPasswordRequestDto dto);
    Task<bool> ConfirmPasswordResetAsync(ResetPasswordConfirmDto dto);
    Task<UserDto> CreateSuperadminAsync(CreateSuperadminDto dto);
    Task<UserDto?> GetMeAsync(int userId);
}

public class AuthService : IAuthService
{
    private readonly TokokuUserDbContext _dbContext;
    private readonly IPasswordHasherService _passwordHasher;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        TokokuUserDbContext dbContext,
        IPasswordHasherService passwordHasher,
        IJwtService jwtService,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var existing = await _dbContext.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (existing)
        {
            throw new InvalidOperationException("Email sudah terdaftar dalam sistem.");
        }

        var passwordHash = _passwordHasher.HashPassword(dto.Password);

        var user = new User
        {
            FullName = dto.FullName.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            Role = "User",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Pengguna baru terdaftar dengan ID {UserId} ({Email}).", user.Id, user.Email);

        var (token, expiration) = _jwtService.GenerateToken(user);

        return new AuthResponseDto
        {
            Token = token,
            Expiration = expiration,
            User = MapToDto(user)
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        if (user is null)
        {
            throw new UnauthorizedAccessException("Email atau password tidak valid.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Akun Anda telah dinonaktifkan. Silakan hubungi administrator.");
        }

        var isValidPassword = _passwordHasher.VerifyPassword(dto.Password, user.PasswordHash);
        if (!isValidPassword)
        {
            _logger.LogWarning("Percobaan login gagal untuk email {Email}.", normalizedEmail);
            throw new UnauthorizedAccessException("Email atau password tidak valid.");
        }

        var (token, expiration) = _jwtService.GenerateToken(user);
        _logger.LogInformation("Pengguna {Email} (Role: {Role}) berhasil login.", user.Email, user.Role);

        return new AuthResponseDto
        {
            Token = token,
            Expiration = expiration,
            User = MapToDto(user)
        };
    }

    public async Task<string> RequestPasswordResetAsync(ResetPasswordRequestDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        if (user is null)
        {
            // Untuk keamanan, jangan bocorkan apakah email terdaftar
            return string.Empty;
        }

        // Generate token kriptografi aman
        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            Token = rawToken,
            Expiry = DateTime.UtcNow.AddHours(2), // Berlaku 2 jam
            IsUsed = false,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.PasswordResetTokens.Add(resetToken);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Reset password token dibuat untuk pengguna ID {UserId} ({Email}).", user.Id, user.Email);

        return rawToken;
    }

    public async Task<bool> ConfirmPasswordResetAsync(ResetPasswordConfirmDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        if (user is null)
        {
            throw new InvalidOperationException("Pengguna tidak ditemukan.");
        }

        var resetToken = await _dbContext.PasswordResetTokens
            .Where(t => t.UserId == user.Id && t.Token == dto.Token && !t.IsUsed)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (resetToken is null)
        {
            throw new InvalidOperationException("Token reset password tidak valid atau sudah digunakan.");
        }

        if (resetToken.Expiry < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Token reset password telah kedaluwarsa.");
        }

        // Update password hash
        user.PasswordHash = _passwordHasher.HashPassword(dto.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        resetToken.IsUsed = true;

        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("Password untuk pengguna ID {UserId} ({Email}) berhasil diubah.", user.Id, user.Email);

        return true;
    }

    public async Task<UserDto> CreateSuperadminAsync(CreateSuperadminDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var existing = await _dbContext.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (existing)
        {
            throw new InvalidOperationException("Email sudah terdaftar dalam sistem.");
        }

        var masterKeyConfig = _configuration["Auth:MasterKey"] ?? "TokokuMasterKey2026!";
        if (!string.IsNullOrEmpty(dto.MasterKey) && dto.MasterKey != masterKeyConfig)
        {
            throw new UnauthorizedAccessException("Master Key tidak valid.");
        }

        var passwordHash = _passwordHasher.HashPassword(dto.Password);

        var superadmin = new User
        {
            FullName = dto.FullName.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            Role = "SuperAdmin",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(superadmin);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Superadmin baru berhasil dibuat: ID {UserId} ({Email}).", superadmin.Id, superadmin.Email);

        return MapToDto(superadmin);
    }

    public async Task<UserDto?> GetMeAsync(int userId)
    {
        var user = await _dbContext.Users.FindAsync(userId);
        return user is null ? null : MapToDto(user);
    }

    private static UserDto MapToDto(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}
