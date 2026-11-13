import { Category } from './category.model';

export interface Product {
  id?: number;
  name: string;
  price: number;
  stock?: number;
  discount?: number;
  categoryId?: number | null;
  category?: Category;
  createdAt?: string;
}
