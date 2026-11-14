using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Model.AuthTokoku.DTOs;
using ServiceAuthTokoku.Services;

namespace ServiceAuthTokoku.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Pendaftaran akun pengguna baru.
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest(new { message = "Nama lengkap wajib diisi." });

        if (string.IsNullOrWhiteSpace(dto.Email) || !dto.Email.Contains('@'))
            return BadRequest(new { message = "Format email tidak valid." });

        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
            return BadRequest(new { message = "Password minimal terdiri dari 6 karakter." });

        try
        {
            var result = await _authService.RegisterAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Login pengguna untuk memperoleh token JWT.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Email dan password wajib diisi." });

        try
        {
            var result = await _authService.LoginAsync(dto);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Mengajukan permintaan reset password dan menghasilkan token reset.
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ResetPasswordRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Email wajib diisi." });

        var token = await _authService.RequestPasswordResetAsync(dto);

        return Ok(new
        {
            message = "Jika email terdaftar, instruksi reset password telah dikirimkan.",
            resetToken = string.IsNullOrEmpty(token) ? null : token
        });
    }

    /// <summary>
    /// Konfirmasi reset password dengan token baru.
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordConfirmDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Token))
            return BadRequest(new { message = "Email dan token wajib diisi." });

        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            return BadRequest(new { message = "Password baru minimal terdiri dari 6 karakter." });

        try
        {
            await _authService.ConfirmPasswordResetAsync(dto);
            return Ok(new { message = "Password berhasil diubah. Silakan login kembali dengan password baru." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Menambahkan akun Superadmin baru (membutuhkan MasterKey atau role SuperAdmin).
    /// </summary>
    [HttpPost("superadmin")]
    public async Task<IActionResult> CreateSuperadmin([FromBody] CreateSuperadminDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Nama dan email wajib diisi." });

        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
            return BadRequest(new { message = "Password minimal terdiri dari 6 karakter." });

        // Periksa apakah request memiliki otorisasi Superadmin ATAU MasterKey yang valid
        var isSuperAdminAuth = User.Identity?.IsAuthenticated == true && User.IsInRole("SuperAdmin");
        if (!isSuperAdminAuth && string.IsNullOrWhiteSpace(dto.MasterKey))
        {
            return Unauthorized(new { message = "Akses ditolak. Dibutuhkan token SuperAdmin atau Master Key." });
        }

        try
        {
            var result = await _authService.CreateSuperadminAsync(dto);
            return CreatedAtAction(nameof(GetMe), new { }, result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Mendapatkan profil data pengguna yang sedang login saat ini.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(subClaim) || !int.TryParse(subClaim, out var userId))
        {
            return Unauthorized(new { message = "Token pengguna tidak valid." });
        }

        var user = await _authService.GetMeAsync(userId);
        if (user is null)
        {
            return NotFound(new { message = "Pengguna tidak ditemukan." });
        }

        return Ok(user);
    }
}
