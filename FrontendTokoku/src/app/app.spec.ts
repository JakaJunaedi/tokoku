import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { App } from './app';
import { ProductService } from './services/product.service';

describe('App', () => {
  const mockProductService = {
    getProducts: () => of([]),
    createProduct: () => of({ id: 1, name: 'Test', price: 1000 }),
    updateProduct: () => of({ id: 1, name: 'Test Updated', price: 2000 }),
    deleteProduct: () => of(void 0)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        { provide: ProductService, useValue: mockProductService }
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
});
