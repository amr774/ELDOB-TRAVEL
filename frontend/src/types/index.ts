export type Role = 'CUSTOMER' | 'EMPLOYEE' | 'OWNER';
export type Status = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  operationsEnabled: boolean;
}
export interface Car {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  pricePerDay: number;
  image?: string;
  images: string[];
  category?: string;
  capacity?: number;
  available: boolean;
  averageRating?: number;
  reviewCount?: number;
}
export interface Page<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
export interface Booking {
  id: string;
  car: Car;
  user?: User;
  startDate: string;
  endDate: string;
  status: Status;
  totalPrice: number;
  pickupLocation?: string;
  notes?: string;
}
export interface ServiceRequest {
  id: string;
  kind: 'TRIP' | 'HOTEL' | 'INQUIRY';
  status: Status;
  city?: string;
  pickupLocation?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  passengers?: number;
  rooms?: number;
  preference?: string;
  notes?: string;
  reply?: string;
  quotedPrice?: number;
  user?: User;
}
export interface Review {
  id: string;
  user: Pick<User, 'id' | 'fullName'>;
  rating: number;
  comment?: string;
}
