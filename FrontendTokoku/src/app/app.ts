import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';
import { Product } from './models/product.model';
import { Category } from './models/category.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);

  // Active Navigation Tab
  readonly activeTab = signal<'products' | 'categories'>('products');

  // Product State Signals
  readonly products = signal<Product[]>([]);
  readonly isProductLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Product Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly activeProductId = signal<number | null>(null);
  readonly productToDelete = signal<Product | null>(null);

  // Product Form Fields
  nameInput = '';
  priceInput: number | null = null;
  stockInput: number | null = null;
  discountInput: number | null = null;
  categoryIdInput: number | null = null;
  formError = '';

  // Category State Signals
  readonly categories = signal<Category[]>([]);
  readonly isCategoryLoading = signal<boolean>(false);
  readonly categorySearchQuery = signal<string>('');

  // Category Modal State
  readonly isCategoryModalOpen = signal<boolean>(false);
  readonly isDeleteCategoryModalOpen = signal<boolean>(false);
  readonly isCategoryEditing = signal<boolean>(false);
  readonly activeCategoryId = signal<number | null>(null);
  readonly categoryToDelete = signal<Category | null>(null);

  // Category Form Fields
  categoryNameInput = '';
  categoryDescInput = '';
  categoryFormError = '';

  // Computed Values - Products
  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.products();
    if (!query) return list;
    return list.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.category?.name && p.category.name.toLowerCase().includes(query))
    );
  });

  readonly totalProducts = computed(() => this.products().length);

  readonly totalInventoryValue = computed(() => {
    return this.products().reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  });

  readonly averagePrice = computed(() => {
    const total = this.totalProducts();
    if (total === 0) return 0;
    return this.totalInventoryValue() / total;
  });

  // Computed Values - Categories
  readonly filteredCategories = computed(() => {
    const query = this.categorySearchQuery().toLowerCase().trim();
    const list = this.categories();
    if (!query) return list;
    return list.filter(c => 
      c.name.toLowerCase().includes(query) || 
      (c.description && c.description.toLowerCase().includes(query))
    );
  });

  readonly totalCategories = computed(() => this.categories().length);

  formatRupiah(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.fetchProducts();
    this.fetchCategories();
  }

  // ================= PRODUK CRUD =================

  fetchProducts(): void {
    this.isProductLoading.set(true);
    this.errorMessage.set(null);

    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.isProductLoading.set(false);
      },
      error: (err) => {
        console.error('Gagal mengambil data produk:', err);
        this.errorMessage.set('Gagal terhubung ke backend API (http://localhost:5242). Pastikan backend aktif.');
        this.isProductLoading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.activeProductId.set(null);
    this.nameInput = '';
    this.priceInput = null;
    this.stockInput = null;
    this.discountInput = null;
    this.categoryIdInput = null;
    this.formError = '';
    this.isModalOpen.set(true);
  }

  openEditModal(product: Product): void {
    this.isEditing.set(true);
    this.activeProductId.set(product.id ?? null);
    this.nameInput = product.name;
    this.priceInput = product.price;
    this.stockInput = product.stock ?? 0;
    this.discountInput = product.discount ?? 0;
    this.categoryIdInput = product.categoryId ?? null;
    this.formError = '';
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.formError = '';
  }

  saveProduct(): void {
    const name = this.nameInput.trim();
    const price = Number(this.priceInput);
    const stock = this.stockInput === null || isNaN(Number(this.stockInput)) ? 0 : Number(this.stockInput);
    const discount = this.discountInput === null || isNaN(Number(this.discountInput)) ? 0 : Number(this.discountInput);
    const categoryId = this.categoryIdInput ? Number(this.categoryIdInput) : null;

    if (!name) {
      this.formError = 'Nama produk wajib diisi.';
      return;
    }

    if (this.priceInput === null || isNaN(price) || price < 0) {
      this.formError = 'Harga produk harus berupa angka positif.';
      return;
    }

    if (stock < 0) {
      this.formError = 'Stok produk tidak boleh bernilai negatif.';
      return;
    }

    if (discount < 0) {
      this.formError = 'Diskon produk tidak boleh bernilai negatif.';
      return;
    }

    if (discount > price) {
      this.formError = 'Diskon tidak boleh melebihi harga produk.';
      return;
    }

    this.isSubmitting.set(true);
    this.formError = '';

    const payload = { name, price, stock, discount, categoryId };

    if (this.isEditing() && this.activeProductId()) {
      const id = this.activeProductId()!;
      this.productService.updateProduct(id, payload).subscribe({
        next: (updated) => {
          // Relasi category
          const categoryObj = this.categories().find(c => c.id === categoryId);
          const fullProduct: Product = { ...updated, category: categoryObj };
          this.products.update(list => list.map(item => item.id === id ? fullProduct : item));
          this.isSubmitting.set(false);
          this.closeModal();
          this.showToast(`Produk "${updated.name}" berhasil diperbarui.`);
        },
        error: (err) => {
          console.error(err);
          this.formError = 'Gagal memperbarui produk. Silakan coba lagi.';
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.productService.createProduct(payload).subscribe({
        next: (created) => {
          const categoryObj = this.categories().find(c => c.id === categoryId);
          const fullProduct: Product = { ...created, category: categoryObj };
          this.products.update(list => [...list, fullProduct]);
          this.isSubmitting.set(false);
          this.closeModal();
          this.showToast(`Produk "${created.name}" berhasil ditambahkan.`);
        },
        error: (err) => {
          console.error(err);
          this.formError = 'Gagal menyimpan produk baru. Silakan coba lagi.';
          this.isSubmitting.set(false);
        }
      });
    }
  }

  openDeleteModal(product: Product): void {
    this.productToDelete.set(product);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    const target = this.productToDelete();
    if (!target || !target.id) return;

    this.isSubmitting.set(true);
    this.productService.deleteProduct(target.id).subscribe({
      next: () => {
        this.products.update(list => list.filter(item => item.id !== target.id));
        this.isSubmitting.set(false);
        this.closeDeleteModal();
        this.showToast(`Produk "${target.name}" berhasil dihapus.`);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('Gagal menghapus produk. Silakan periksa koneksi.');
        this.isSubmitting.set(false);
        this.closeDeleteModal();
      }
    });
  }

  // ================= KATEGORI CRUD =================

  fetchCategories(): void {
    this.isCategoryLoading.set(true);

    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.isCategoryLoading.set(false);
      },
      error: (err) => {
        console.error('Gagal mengambil data kategori:', err);
        this.isCategoryLoading.set(false);
      }
    });
  }

  openCreateCategoryModal(): void {
    this.isCategoryEditing.set(false);
    this.activeCategoryId.set(null);
    this.categoryNameInput = '';
    this.categoryDescInput = '';
    this.categoryFormError = '';
    this.isCategoryModalOpen.set(true);
  }

  openEditCategoryModal(category: Category): void {
    this.isCategoryEditing.set(true);
    this.activeCategoryId.set(category.id ?? null);
    this.categoryNameInput = category.name;
    this.categoryDescInput = category.description ?? '';
    this.categoryFormError = '';
    this.isCategoryModalOpen.set(true);
  }

  closeCategoryModal(): void {
    this.isCategoryModalOpen.set(false);
    this.categoryFormError = '';
  }

  saveCategory(): void {
    const name = this.categoryNameInput.trim();
    const description = this.categoryDescInput.trim() || undefined;

    if (!name) {
      this.categoryFormError = 'Nama kategori wajib diisi.';
      return;
    }

    this.isSubmitting.set(true);
    this.categoryFormError = '';

    if (this.isCategoryEditing() && this.activeCategoryId()) {
      const id = this.activeCategoryId()!;
      this.categoryService.updateCategory(id, { name, description }).subscribe({
        next: (updated) => {
          this.categories.update(list => list.map(item => item.id === id ? updated : item));
          // Refresh products to sync category names
          this.fetchProducts();
          this.isSubmitting.set(false);
          this.closeCategoryModal();
          this.showToast(`Kategori "${updated.name}" berhasil diperbarui.`);
        },
        error: (err) => {
          console.error(err);
          this.categoryFormError = 'Gagal memperbarui kategori. Silakan coba lagi.';
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.categoryService.createCategory({ name, description }).subscribe({
        next: (created) => {
          this.categories.update(list => [...list, created]);
          this.isSubmitting.set(false);
          this.closeCategoryModal();
          this.showToast(`Kategori "${created.name}" berhasil ditambahkan.`);
        },
        error: (err) => {
          console.error(err);
          this.categoryFormError = 'Gagal menyimpan kategori baru. Silakan coba lagi.';
          this.isSubmitting.set(false);
        }
      });
    }
  }

  openDeleteCategoryModal(category: Category): void {
    this.categoryToDelete.set(category);
    this.isDeleteCategoryModalOpen.set(true);
  }

  closeDeleteCategoryModal(): void {
    this.isDeleteCategoryModalOpen.set(false);
    this.categoryToDelete.set(null);
  }

  confirmDeleteCategory(): void {
    const target = this.categoryToDelete();
    if (!target || !target.id) return;

    this.isSubmitting.set(true);
    this.categoryService.deleteCategory(target.id).subscribe({
      next: () => {
        this.categories.update(list => list.filter(item => item.id !== target.id));
        // Refresh products because their category relation might be set null
        this.fetchProducts();
        this.isSubmitting.set(false);
        this.closeDeleteCategoryModal();
        this.showToast(`Kategori "${target.name}" berhasil dihapus.`);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('Gagal menghapus kategori. Silakan periksa koneksi.');
        this.isSubmitting.set(false);
        this.closeDeleteCategoryModal();
      }
    });
  }

  private showToast(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => {
      this.successMessage.set(null);
    }, 3500);
  }
}
