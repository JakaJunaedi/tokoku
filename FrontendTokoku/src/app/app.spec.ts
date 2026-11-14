import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { App } from './app';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';
import { AuthService } from './services/auth.service';

describe('App', () => {
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
    isAuthenticated: () => false,
    isSuperAdmin: () => false,
    login: () => of({ token: 'mock-jwt', expiration: '', user: { id: 1, fullName: 'Admin', role: 'SuperAdmin' } }),
    register: () => of({ token: 'mock-jwt', expiration: '', user: { id: 2, fullName: 'User', role: 'User' } }),
    logout: () => {},
    forgotPassword: () => of({ message: 'Success', resetToken: 'mock-token' }),
    resetPassword: () => of({ message: 'Success' }),
    createSuperadmin: () => of({ id: 3, fullName: 'Superadmin', role: 'SuperAdmin' })
  };

  beforeEach(async () => {
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

  it('should load initial categories and products', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const app = fixture.componentInstance;
    expect(app.categories().length).toBe(2);
  });
});
