import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowUpRight, Users } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Car } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../features/auth/AuthProvider';
import { api, imageUrl } from '../services/api';
import { Feedback } from './ui';
import { VehicleImage } from './VehicleImage';
export function CarCard({
  car,
  favorite = false,
}: {
  car: Car;
  favorite?: boolean;
}) {
  const { t, money } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      favorite
        ? api.delete(`/favorites/${car.id}`)
        : api.post(`/favorites/${car.id}`),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['favorites'] }),
  });
  return (
    <article className="car-card">
      <div className="car-image">
        <VehicleImage src={imageUrl(car.image)} alt={car.name} />
        <span className="image-label">
          {car.category || t('Chauffeur included', 'مع سائق')}
        </span>
        <button
          className="favorite"
          aria-label={
            favorite
              ? t('Remove favorite', 'إزالة المفضلة')
              : t('Save vehicle', 'حفظ السيارة')
          }
          aria-pressed={favorite}
          disabled={save.isPending}
          onClick={() => (user ? save.mutate() : navigate('/login'))}
        >
          <Heart size={19} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="car-body">
        <p className="eyebrow">
          {car.brand} · {car.year}
        </p>
        <h3>
          <Link to={`/cars/${car.id}`}>{car.name}</Link>
        </h3>
        <p>
          {car.model}
          {car.capacity && (
            <>
              {' '}
              · <Users size={14} /> {car.capacity} {t('guests', 'ركاب')}
            </>
          )}
        </p>
        <div className="car-bottom">
          <span>
            <strong>{money(car.pricePerDay)}</strong>
            <small> / {t('day', 'يوم')}</small>
          </span>
          <Link
            aria-label={`${t('View', 'عرض')} ${car.name}`}
            to={`/cars/${car.id}`}
            className="circle-link"
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
        <Feedback
          error={save.error}
          success={
            save.isSuccess
              ? t('Favorites updated', 'تم تحديث المفضلة')
              : undefined
          }
        />
      </div>
    </article>
  );
}
