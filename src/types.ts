export type ProductCategory = 'drinks' | 'milk_options' | 'add_ons' | 'regular' | 'special';

export type OrderStatus = 'New' | 'Accepted' | 'Preparing' | 'Ready' | 'Completed' | 'Rejected';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  basePrice: number;
  size?: 'regular' | 'large';
  type?: 'classic' | 'cloudy' | 'mango' | 'strawberry';
  description?: string;
  image?: string;
  available?: boolean;
}

export interface Addon {
  id: string;
  name: string;
  price: number; // 0 for Free
  category?: 'Milk' | 'Foam' | string;
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  selectedAddons: Addon[];
  quantity: number;
  totalPrice: number;
}

export type UserRole = 'customer' | 'store_owner';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt?: string;
}

export interface OrderedProductItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  selectedAddons: Addon[];
  totalItemPrice: number;
}

export type FulfillmentMethod = 'delivery' | 'pickup';

export interface CustomerOrder {
  id?: string;
  customerUid: string;
  customerFullName: string;
  customerEmail?: string;
  productsOrdered: OrderedProductItem[];
  quantities: number;
  totalPrice: number;
  orderStatus: OrderStatus | 'pending';
  paymentStatus: 'pending' | 'paid' | 'cash_on_delivery';
  paymentMethod?: 'cash' | 'bank_transfer';
  fulfillmentMethod?: FulfillmentMethod;
  createdTimestamp: string;
}
