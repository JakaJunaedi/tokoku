import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from './services/product.service';
import { Product } from './models/product.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly productService = inject(ProductService);

  // State Signals
  readonly products = signal<Product[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly activeProductId = signal<number | null>(null);
  readonly productToDelete = signal<Product | null>(null);

  // Form State
  nameInput = '';
  priceInput: number | null = null;
  stockInput: number | null = null;
  formError = '';

  // Computed Values
  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.products();
    if (!query) return list;
    return list.filter(p => p.name.toLowerCase().includes(query));
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

  formatRupiah(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  ngOnInit(): void {
    this.fetchProducts();
  }

  fetchProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Gagal mengambil data produk:', err);
        this.errorMessage.set('Gagal terhubung ke backend API (http://localhost:5242). Pastikan backend aktif.');
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.activeProductId.set(null);
    this.nameInput = '';
    this.priceInput = null;
    this.stockInput = null;
    this.formError = '';
    this.isModalOpen.set(true);
  }

  openEditModal(product: Product): void {
    this.isEditing.set(true);
    this.activeProductId.set(product.id ?? null);
    this.nameInput = product.name;
    this.priceInput = product.price;
    this.stockInput = product.stock ?? 0;
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

    this.isSubmitting.set(true);
    this.formError = '';

    if (this.isEditing() && this.activeProductId()) {
      // Update
      const id = this.activeProductId()!;
      this.productService.updateProduct(id, { name, price, stock }).subscribe({
        next: (updated) => {
          this.products.update(list => list.map(item => item.id === id ? updated : item));
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
      // Create
      this.productService.createProduct({ name, price, stock }).subscribe({
        next: (created) => {
          this.products.update(list => [...list, created]);
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

  private showToast(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => {
      this.successMessage.set(null);
    }, 3500);
  }
}
