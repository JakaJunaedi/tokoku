import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';
import { AuthService } from './services/auth.service';
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
  readonly authService = inject(AuthService);

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

  // ================= AUTH STATES =================
  readonly isAuthModalOpen = signal<boolean>(false);
  readonly authTab = signal<'login' | 'register' | 'forgot' | 'reset'>('login');
  readonly isAuthSubmitting = signal<boolean>(false);
  readonly authError = signal<string | null>(null);
  readonly generatedResetToken = signal<string | null>(null);

  // Auth Form Fields
  loginEmail = '';
  loginPassword = '';

  registerFullName = '';
  registerEmail = '';
  registerPassword = '';

  forgotEmail = '';

  resetTokenInput = '';
  resetNewPassword = '';

  // Superadmin Modal State
  readonly isSuperadminModalOpen = signal<boolean>(false);
  readonly isSuperadminSubmitting = signal<boolean>(false);
  readonly superadminError = signal<string | null>(null);

  superadminFullName = '';
  superadminEmail = '';
  superadminPassword = '';
  superadminMasterKey = '';

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
    if (this.authService.isAuthenticated()) {
      this.refreshAll();
    } else {
      // Guard protect: cegah akses dashboard sebelum login dan buka modal auth
      this.openAuthModal('login');
    }
  }

  refreshAll(): void {
    if (!this.authService.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }
    this.fetchProducts();
    this.fetchCategories();
  }

  // ================= PRODUK CRUD =================

  fetchProducts(): void {
    if (!this.authService.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }

    this.isProductLoading.set(true);
    this.errorMessage.set(null);

    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.isProductLoading.set(false);
      },
      error: (err) => {
        console.error('Gagal mengambil data produk:', err);
        this.errorMessage.set('Gagal terhubung ke backend API produk (http://localhost:5242). Pastikan backend aktif.');
        this.isProductLoading.set(false);
      }
    });
  }

  openCreateModal(): void {
    if (!this.authService.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }
    this.isEditing.set(false);
    this.activeProductId.set(null);
    this.nameInput = '';
    this.priceInput = null;
    this.stockInput = null;
    this.categoryIdInput = null;
    this.formError = '';
    this.isModalOpen.set(true);
  }

  openEditModal(product: Product): void {
    if (!this.authService.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }
    this.isEditing.set(true);
    this.activeProductId.set(product.id ?? null);
    this.nameInput = product.name;
    this.priceInput = product.price;
    this.stockInput = product.stock ?? 0;
    this.categoryIdInput = product.categoryId ?? null;
    this.formError = '';
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.formError = '';
  }

  saveProduct(): void {
    if (!this.authService.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }
    const name = this.nameInput.trim();
    const price = Number(this.priceInput);
    const stock = this.stockInput === null || isNaN(Number(this.stockInput)) ? 0 : Number(this.stockInput);
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

    this.isSubmitting.set(true);
    this.formError = '';

    const payload = { name, price, stock, categoryId };

    if (this.isEditing() && this.activeProductId()) {
      const id = this.activeProductId()!;
      this.productService.updateProduct(id, payload).subscribe({
        next: (updated) => {
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
    if (!this.authService.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }
    this.productToDelete.set(product);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    if (!this.authService.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }
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
    if (!this.authService.isAuthenticated()) {
      return;
    }
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
    if (!this.authService.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }
    this.isCategoryEditing.set(false);
    this.activeCategoryId.set(null);
    this.categoryNameInput = '';
    this.categoryDescInput = '';
    this.categoryFormError = '';
    this.isCategoryModalOpen.set(true);
  }

  openEditCategoryModal(category: Category): void {
    if (!this.authService.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }
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
    if (!this.authService.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }
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

  // ================= AUTHENTICATION ACTIONS =================

  openAuthModal(tab: 'login' | 'register' | 'forgot' = 'login'): void {
    this.authTab.set(tab);
    this.authError.set(null);
    this.generatedResetToken.set(null);
    this.isAuthModalOpen.set(true);
  }

  closeAuthModal(): void {
    this.isAuthModalOpen.set(false);
    this.authError.set(null);
    this.generatedResetToken.set(null);
  }

  submitLogin(): void {
    if (!this.loginEmail || !this.loginPassword) {
      this.authError.set('Email dan password wajib diisi.');
      return;
    }

    this.isAuthSubmitting.set(true);
    this.authError.set(null);

    this.authService.login({ email: this.loginEmail, password: this.loginPassword }).subscribe({
      next: (res) => {
        this.isAuthSubmitting.set(false);
        this.closeAuthModal();
        this.loginEmail = '';
        this.loginPassword = '';
        this.refreshAll();
        this.showToast(`Selamat datang kembali, ${res.user.fullName}!`);
      },
      error: (err) => {
        console.error(err);
        this.isAuthSubmitting.set(false);
        this.authError.set(err.error?.message || 'Email atau password salah. Pastikan Auth Service :5251 aktif.');
      }
    });
  }

  submitRegister(): void {
    if (!this.registerFullName || !this.registerEmail || !this.registerPassword) {
      this.authError.set('Semua field registrasi wajib diisi.');
      return;
    }

    if (this.registerPassword.length < 6) {
      this.authError.set('Password minimal terdiri dari 6 karakter.');
      return;
    }

    this.isAuthSubmitting.set(true);
    this.authError.set(null);

    this.authService.register({
      fullName: this.registerFullName,
      email: this.registerEmail,
      password: this.registerPassword
    }).subscribe({
      next: (res) => {
        this.isAuthSubmitting.set(false);
        this.closeAuthModal();
        this.registerFullName = '';
        this.registerEmail = '';
        this.registerPassword = '';
        this.refreshAll();
        this.showToast(`Registrasi berhasil! Selamat bergabung, ${res.user.fullName}.`);
      },
      error: (err) => {
        console.error(err);
        this.isAuthSubmitting.set(false);
        this.authError.set(err.error?.message || 'Registrasi gagal. Email mungkin sudah terdaftar.');
      }
    });
  }

  submitForgotPassword(): void {
    if (!this.forgotEmail) {
      this.authError.set('Silakan masukkan email Anda.');
      return;
    }

    this.isAuthSubmitting.set(true);
    this.authError.set(null);

    this.authService.forgotPassword({ email: this.forgotEmail }).subscribe({
      next: (res) => {
        this.isAuthSubmitting.set(false);
        if (res.resetToken) {
          this.generatedResetToken.set(res.resetToken);
          this.resetTokenInput = res.resetToken;
          this.authTab.set('reset');
        } else {
          this.showToast(res.message);
          this.closeAuthModal();
        }
      },
      error: (err) => {
        console.error(err);
        this.isAuthSubmitting.set(false);
        this.authError.set(err.error?.message || 'Gagal memproses permintaan reset password.');
      }
    });
  }

  submitResetPassword(): void {
    if (!this.resetTokenInput || !this.resetNewPassword) {
      this.authError.set('Token dan password baru wajib diisi.');
      return;
    }

    if (this.resetNewPassword.length < 6) {
      this.authError.set('Password baru minimal terdiri dari 6 karakter.');
      return;
    }

    this.isAuthSubmitting.set(true);
    this.authError.set(null);

    this.authService.resetPassword({
      email: this.forgotEmail,
      token: this.resetTokenInput,
      newPassword: this.resetNewPassword
    }).subscribe({
      next: (res) => {
        this.isAuthSubmitting.set(false);
        this.showToast(res.message || 'Password berhasil diperbarui!');
        this.authTab.set('login');
        this.resetTokenInput = '';
        this.resetNewPassword = '';
        this.generatedResetToken.set(null);
      },
      error: (err) => {
        console.error(err);
        this.isAuthSubmitting.set(false);
        this.authError.set(err.error?.message || 'Token reset tidak valid atau telah kedaluwarsa.');
      }
    });
  }

  logout(): void {
    const user = this.authService.currentUser();
    this.authService.logout();
    this.products.set([]);
    this.categories.set([]);
    this.openAuthModal('login');
    this.showToast(`Anda telah logout.${user ? ` Sampai jumpa, ${user.fullName}!` : ''}`);
  }

  // ================= SUPERADMIN MODAL =================

  openSuperadminModal(): void {
    this.superadminFullName = '';
    this.superadminEmail = '';
    this.superadminPassword = '';
    this.superadminMasterKey = '';
    this.superadminError.set(null);
    this.isSuperadminModalOpen.set(true);
  }

  closeSuperadminModal(): void {
    this.isSuperadminModalOpen.set(false);
    this.superadminError.set(null);
  }

  submitCreateSuperadmin(): void {
    if (!this.superadminFullName || !this.superadminEmail || !this.superadminPassword) {
      this.superadminError.set('Nama, email, dan password wajib diisi.');
      return;
    }

    this.isSuperadminSubmitting.set(true);
    this.superadminError.set(null);

    this.authService.createSuperadmin({
      fullName: this.superadminFullName,
      email: this.superadminEmail,
      password: this.superadminPassword,
      masterKey: this.superadminMasterKey || undefined
    }).subscribe({
      next: (user) => {
        this.isSuperadminSubmitting.set(false);
        this.closeSuperadminModal();
        this.showToast(`Akun SuperAdmin baru "${user.fullName}" (${user.email}) berhasil dibuat!`);
      },
      error: (err) => {
        console.error(err);
        this.isSuperadminSubmitting.set(false);
        this.superadminError.set(err.error?.message || 'Gagal membuat superadmin. Periksa hak akses atau master key.');
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
