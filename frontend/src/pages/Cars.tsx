import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../services/api';
import type { Car, Page } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { CarCard } from '../components/CarCard';
import { PageTitle, LoadState } from '../components/ui';
export function Cars() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const cars = useQuery({
    queryKey: ['cars', params.toString()],
    queryFn: async () =>
      (
        await api.get<Page<Car>>('/cars', {
          params: { ...Object.fromEntries(params), limit: 9 },
        })
      ).data,
  });
  const page = Number(params.get('page') || 1);
  return (
    <div className="section fleet-page">
      <PageTitle
        eyebrow={t('THE ELDOB FLEET', 'سيارات الدب')}
        title={t('Find your kind of journey.', 'اختر ما يناسب رحلتك.')}
        text={t(
          'Every vehicle comes with a professional driver. Choose your comfort, and leave the road to us.',
          'كل سيارة مع سائق محترف. اختر راحتك واترك لنا الطريق.',
        )}
      />
      <form
        key={params.toString()}
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          const values = new FormData(e.currentTarget);
          setParams(
            Object.fromEntries(
              [...values].map(([k, v]) => [k, String(v)]).filter(([, v]) => v),
            ),
          );
        }}
      >
        <label>
          <span>
            <Search size={16} />
            {t('Search vehicles', 'ابحث عن سيارة')}
          </span>
          <input
            name="search"
            defaultValue={params.get('search') || ''}
            placeholder={t(
              'Name, brand or model',
              'الاسم أو الماركة أو الموديل',
            )}
          />
        </label>
        <label>
          {t('Brand', 'الماركة')}
          <input
            name="brand"
            defaultValue={params.get('brand') || ''}
            placeholder={t('Any brand', 'كل الماركات')}
          />
        </label>
        <label>
          {t('Category', 'الفئة')}
          <select name="category" defaultValue={params.get('category') || ''}>
            <option value="">{t('All categories', 'كل الفئات')}</option>
            {['Sedan', 'SUV', 'Van', 'Minibus', 'Luxury'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          {t('Min. EGP/day', 'أقل سعر يومي')}
          <input
            name="minPrice"
            type="number"
            min="0"
            defaultValue={params.get('minPrice') || ''}
          />
        </label>
        <label>
          {t('Max. EGP/day', 'أقصى سعر يومي')}
          <input
            name="maxPrice"
            type="number"
            min="0"
            defaultValue={params.get('maxPrice') || ''}
          />
        </label>
        <label>
          {t('Sort by', 'ترتيب حسب')}
          <select name="sort" defaultValue={params.get('sort') || 'newest'}>
            <option value="newest">{t('Newest', 'الأحدث')}</option>
            <option value="priceAsc">
              {t('Price: low to high', 'السعر: من الأقل')}
            </option>
            <option value="priceDesc">
              {t('Price: high to low', 'السعر: من الأعلى')}
            </option>
          </select>
        </label>
        <button type="submit">
          <SlidersHorizontal size={17} />
          {t('Apply', 'تطبيق')}
        </button>
      </form>
      <div className="results-heading">
        <span>
          {cars.data
            ? `${cars.data.meta.total} ${t('vehicles', 'سيارة')}`
            : t('Our fleet', 'سياراتنا')}
        </span>
        <button className="text-link" onClick={() => setParams({})}>
          {t('Clear filters', 'مسح الفلاتر')}
        </button>
      </div>
      <LoadState
        loading={cars.isPending}
        error={cars.error}
        empty={!cars.data?.data.length}
        retry={() => void cars.refetch()}
      >
        <div className="grid three">
          {cars.data?.data.map((car) => (
            <CarCard car={car} key={car.id} />
          ))}
        </div>
      </LoadState>
      <div className="pagination">
        <button
          disabled={page <= 1}
          onClick={() => {
            params.set('page', String(page - 1));
            setParams(params);
          }}
        >
          {t('Previous', 'السابق')}
        </button>
        <span>
          {page} / {Math.max(1, cars.data?.meta.totalPages || 1)}
        </span>
        <button
          disabled={page >= (cars.data?.meta.totalPages || 1)}
          onClick={() => {
            params.set('page', String(page + 1));
            setParams(params);
          }}
        >
          {t('Next', 'التالي')}
        </button>
      </div>
    </div>
  );
}
