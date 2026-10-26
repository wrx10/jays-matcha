import { Product, Addon } from '../types.ts';

export const REGULAR_PRODUCTS: Product[] = [
  {
    id: 'matcha-classic',
    name: 'الكلاسيك',
    category: 'regular',
    basePrice: 12,
    size: 'regular',
    type: 'classic',
  },
  {
    id: 'matcha-cloudy',
    name: 'الكلاودي',
    category: 'regular',
    basePrice: 13,
    size: 'regular',
    type: 'cloudy',
  },
  {
    id: 'matcha-classic-large',
    name: 'الكلاسيك',
    category: 'regular',
    basePrice: 16,
    size: 'large',
    type: 'classic',
  },
  {
    id: 'matcha-cloudy-large',
    name: 'الكلاودي',
    category: 'regular',
    basePrice: 18,
    size: 'large',
    type: 'cloudy',
  },
];

export const SPECIAL_PRODUCTS: Product[] = [
  {
    id: 'matcha-mango',
    name: 'المانجو',
    category: 'special',
    basePrice: 15,
    size: 'regular',
    type: 'mango',
  },
  {
    id: 'matcha-strawberry',
    name: 'الفراولة',
    category: 'special',
    basePrice: 15,
    size: 'regular',
    type: 'strawberry',
  },
  {
    id: 'matcha-mango-large',
    name: 'المانجو',
    category: 'special',
    basePrice: 20,
    size: 'large',
    type: 'mango',
  },
  {
    id: 'matcha-strawberry-large',
    name: 'الفراولة',
    category: 'special',
    basePrice: 20,
    size: 'large',
    type: 'strawberry',
  },
];

export const AVAILABLE_ADDONS: Addon[] = [
  // Milk
  { id: 'milk-regular', name: 'العادي', price: 0, category: 'Milk' },
  { id: 'milk-vanilla', name: 'الفانيلا', price: 3, category: 'Milk' },
  { id: 'milk-lactose-free', name: 'خالي اللاكتوز', price: 4, category: 'Milk' },
  // Foam
  { id: 'foam-vanilla', name: 'فانيلا', price: 1, category: 'Foam' },
  { id: 'foam-strawberry', name: 'الفراولة', price: 3, category: 'Foam' },
  { id: 'foam-mango', name: 'المانجو', price: 3, category: 'Foam' },
];
