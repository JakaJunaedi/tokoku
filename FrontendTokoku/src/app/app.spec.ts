import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { App } from './app';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';
import { AuthService } from './services/auth.service';

describe('App', () => {
  let isAuthedState = false;

  const mockProductService = {
    getProducts: () => of([]),
    createProduct: () => of({ id: 1, name: 'Test', price: 1000 }),
    updateProduct: () => of({ id: 1, name: 'Test Updated', price: 2000 }),
    deleteProduct: () => of(void 0)
  };

  const mockCategoryService = {
    getCategories: () => of([
      { id: 1, name: 'Foods', description: 'Makanan dan minuman' },
      { id: 2, name: 'Elektronik', description: 'Peralatan elektronik' }
    ]),
    createCategory: () => of({ id: 3, name: 'Obat-obatan' }),
    updateCategory: () => of({ id: 1, name: 'Foods Updated' }),
    deleteCategory: () => of(void 0)
  };

  const mockAuthService = {
    token: signal<string | null>(null),
    currentUser: signal(null),
    isAuthenticated: () => isAuthedState,
    isSuperAdmin: () => false,
    login: () => {
      isAuthedState = true;
      return of({ token: 'mock-jwt', expiration: '', user: { id: 1, fullName: 'Admin', role: 'SuperAdmin' } });
    },
    register: () => of({ token: 'mock-jwt', expiration: '', user: { id: 2, fullName: 'User', role: 'User' } }),
    logout: () => { isAuthedState = false; },
    forgotPassword: () => of({ message: 'Success', resetToken: 'mock-token' }),
    resetPassword: () => of({ message: 'Success' }),
    createSuperadmin: () => of({ id: 3, fullName: 'Superadmin', role: 'SuperAdmin' })
  };

  beforeEach(async () => {
    isAuthedState = false;
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        { provide: ProductService, useValue: mockProductService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render Tokoku brand title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('Tokoku');
  });

  it('should protect dashboard and open auth modal automatically when not authenticated', async () => {
    isAuthedState = false;
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const app = fixture.componentInstance;

    // Guard requirement: auth modal opens automatically
    expect(app.isAuthModalOpen()).toBe(true);
    expect(app.authTab()).toBe('login');
    // Products and categories not fetched when unauthenticated
    expect(app.products().length).toBe(0);
    expect(app.categories().length).toBe(0);

    // Protected view should display guard locked banner
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.auth-guard-container')).toBeTruthy();
    expect(compiled.querySelector('.guard-title')?.textContent).toContain('Dashboard Produk Memerlukan Autentikasi');
  });

  it('should load categories and products when authenticated', async () => {
    isAuthedState = true;
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const app = fixture.componentInstance;

    expect(app.isAuthModalOpen()).toBe(false);
    expect(app.categories().length).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.auth-guard-container')).toBeFalsy();
    expect(compiled.querySelector('.tabs-bar')).toBeTruthy();
  });

  it('should open auth modal when unauthenticated user attempts to create product', () => {
    isAuthedState = false;
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.closeAuthModal();
    expect(app.isAuthModalOpen()).toBe(false);

    app.openCreateModal();
    expect(app.isAuthModalOpen()).toBe(true);
    expect(app.isModalOpen()).toBe(false);
  });
});
