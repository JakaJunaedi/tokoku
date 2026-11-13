using Microsoft.AspNetCore.Mvc;
using Model.Tokoku;
using ServiceTokoku.Services;

namespace ServiceTokoku.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(IProductService productService, ILogger<ProductsController> logger)
    {
        _productService = productService;
        _logger = logger;
    }

    /// <summary>
    /// Mengambil semua produk.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        _logger.LogInformation("Request GET /api/products diterima: Memulai pengambilan data seluruh produk...");
        var products = await _productService.GetAllAsync();
        var count = products.Count();
        _logger.LogInformation("Request GET /api/products selesai: Berhasil menemukan {Count} produk.", count);
        return Ok(products);
    }

    /// <summary>
    /// Mengambil produk berdasarkan ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        _logger.LogInformation("Request GET /api/products/{Id} diterima: Mencari produk...", id);
        var product = await _productService.GetByIdAsync(id);
        if (product is null)
        {
            _logger.LogWarning("Request GET /api/products/{Id}: Produk tidak ditemukan di database.", id);
            return NotFound(new { message = $"Produk dengan ID {id} tidak ditemukan." });
        }

        _logger.LogInformation("Request GET /api/products/{Id}: Produk '{Name}' (Harga: Rp {Price}) ditemukan.", id, product.Name, product.Price);
        return Ok(product);
    }

    /// <summary>
    /// Menambahkan produk baru.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Product product)
    {
        _logger.LogInformation("Request POST /api/products diterima: Data payload {@Product}", new { product.Name, product.Price, product.Stock });

        if (string.IsNullOrWhiteSpace(product.Name))
        {
            _logger.LogWarning("Validasi POST /api/products gagal: Nama produk kosong.");
            return BadRequest(new { message = "Nama produk wajib diisi." });
        }

        if (product.Price < 0)
        {
            _logger.LogWarning("Validasi POST /api/products gagal: Harga bernilai negatif ({Price}).", product.Price);
            return BadRequest(new { message = "Harga produk tidak boleh bernilai negatif." });
        }

        if (product.Stock < 0)
        {
            _logger.LogWarning("Validasi POST /api/products gagal: Stok bernilai negatif ({Stock}).", product.Stock);
            return BadRequest(new { message = "Stok produk tidak boleh bernilai negatif." });
        }

        var created = await _productService.CreateAsync(product);
        _logger.LogInformation("Request POST /api/products sukses: Produk baru berhasil disimpan dengan ID {Id} pada {CreatedAt}.", created.Id, created.CreatedAt);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>
    /// Memperbarui data produk berdasarkan ID.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Product product)
    {
        _logger.LogInformation("Request PUT /api/products/{Id} diterima: Data update {@Product}", id, new { product.Name, product.Price, product.Stock });

        if (string.IsNullOrWhiteSpace(product.Name))
        {
            _logger.LogWarning("Validasi PUT /api/products/{Id} gagal: Nama produk kosong.", id);
            return BadRequest(new { message = "Nama produk wajib diisi." });
        }

        if (product.Price < 0)
        {
            _logger.LogWarning("Validasi PUT /api/products/{Id} gagal: Harga bernilai negatif ({Price}).", id, product.Price);
            return BadRequest(new { message = "Harga produk tidak boleh bernilai negatif." });
        }

        if (product.Stock < 0)
        {
            _logger.LogWarning("Validasi PUT /api/products/{Id} gagal: Stok bernilai negatif ({Stock}).", id, product.Stock);
            return BadRequest(new { message = "Stok produk tidak boleh bernilai negatif." });
        }

        var updated = await _productService.UpdateAsync(id, product);
        if (updated is null)
        {
            _logger.LogWarning("Request PUT /api/products/{Id} gagal: Produk tidak ditemukan untuk diperbarui.", id);
            return NotFound(new { message = $"Produk dengan ID {id} tidak ditemukan." });
        }

        _logger.LogInformation("Request PUT /api/products/{Id} sukses: Produk berhasil diperbarui menjadi Name='{Name}', Price=Rp {Price}.", id, updated.Name, updated.Price);
        return Ok(updated);
    }

    /// <summary>
    /// Menghapus produk berdasarkan ID.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        _logger.LogInformation("Request DELETE /api/products/{Id} diterima: Menghapus produk...", id);
        var deleted = await _productService.DeleteAsync(id);
        if (!deleted)
        {
            _logger.LogWarning("Request DELETE /api/products/{Id} gagal: Produk tidak ditemukan untuk dihapus.", id);
            return NotFound(new { message = $"Produk dengan ID {id} tidak ditemukan." });
        }

        _logger.LogInformation("Request DELETE /api/products/{Id} sukses: Produk berhasil dihapus dari database.", id);
        return NoContent();
    }
}
