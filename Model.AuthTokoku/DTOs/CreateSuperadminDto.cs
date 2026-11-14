namespace Model.AuthTokoku.DTOs;

public class CreateSuperadminDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? MasterKey { get; set; }
}
