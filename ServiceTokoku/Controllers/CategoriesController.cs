using Microsoft.AspNetCore.Mvc;
using Model.Tokoku;
using ServiceTokoku.Services;

namespace ServiceTokoku.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;
    private readonly ILogger<CategoriesController> _logger;

    public CategoriesController(ICategoryService categoryService, ILogger<CategoriesController> logger)
    {
        _categoryService = categoryService;
        _logger = logger;
    }

    /// <summary>
    /// Mengambil seluruh kategori.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        _logger.LogInformation("Request GET /api/categories diterima: Mengambil seluruh data kategori...");
        var categories = await _categoryService.GetAllAsync();
        var count = categories.Count();
        _logger.LogInformation("Request GET /api/categories selesai: Ditemukan {Count} kategori.", count);
        return Ok(categories);
    }

    /// <summary>
    /// Mengambil kategori berdasarkan ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        _logger.LogInformation("Request GET /api/categories/{Id} diterima: Mencari kategori...", id);
        var category = await _categoryService.GetByIdAsync(id);
        if (category is null)
        {
            _logger.LogWarning("Request GET /api/categories/{Id}: Kategori tidak ditemukan.", id);
            return NotFound(new { message = $"Kategori dengan ID {id} tidak ditemukan." });
        }

        _logger.LogInformation("Request GET /api/categories/{Id}: Kategori '{Name}' ditemukan.", id, category.Name);
        return Ok(category);
    }

    /// <summary>
    /// Menambahkan kategori baru.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Category category)
    {
        _logger.LogInformation("Request POST /api/categories diterima: Data payload {@Category}", new { category.Name, category.Description });

        if (string.IsNullOrWhiteSpace(category.Name))
        {
            _logger.LogWarning("Validasi POST /api/categories gagal: Nama kategori kosong.");
            return BadRequest(new { message = "Nama kategori wajib diisi." });
        }

        var created = await _categoryService.CreateAsync(category);
        _logger.LogInformation("Request POST /api/categories sukses: Kategori '{Name}' berhasil disimpan dengan ID {Id}.", created.Name, created.Id);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>
    /// Memperbarui data kategori berdasarkan ID.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Category category)
    {
        _logger.LogInformation("Request PUT /api/categories/{Id} diterima: Data update {@Category}", id, new { category.Name, category.Description });

        if (string.IsNullOrWhiteSpace(category.Name))
        {
            _logger.LogWarning("Validasi PUT /api/categories/{Id} gagal: Nama kategori kosong.", id);
            return BadRequest(new { message = "Nama kategori wajib diisi." });
        }

        var updated = await _categoryService.UpdateAsync(id, category);
        if (updated is null)
        {
            _logger.LogWarning("Request PUT /api/categories/{Id} gagal: Kategori tidak ditemukan.", id);
            return NotFound(new { message = $"Kategori dengan ID {id} tidak ditemukan." });
        }

        _logger.LogInformation("Request PUT /api/categories/{Id} sukses: Kategori berhasil diperbarui menjadi '{Name}'.", id, updated.Name);
        return Ok(updated);
    }

    /// <summary>
    /// Menghapus kategori berdasarkan ID.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        _logger.LogInformation("Request DELETE /api/categories/{Id} diterima: Menghapus kategori...", id);
        var deleted = await _categoryService.DeleteAsync(id);
        if (!deleted)
        {
            _logger.LogWarning("Request DELETE /api/categories/{Id} gagal: Kategori tidak ditemukan.", id);
            return NotFound(new { message = $"Kategori dengan ID {id} tidak ditemukan." });
        }

        _logger.LogInformation("Request DELETE /api/categories/{Id} sukses: Kategori berhasil dihapus.", id);
        return NoContent();
    }
}
