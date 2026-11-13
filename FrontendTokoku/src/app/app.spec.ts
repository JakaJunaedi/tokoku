import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { App } from './app';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        { provide: ProductService, useValue: mockProductService },
        { provide: CategoryService, useValue: mockCategoryService }
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
