export interface Hotel {
  id: string;
  name: string;
  city: string;
  description: string;
  image: string;
  stars: number;
  pricePerNight: number | null;
  available: boolean;
}
