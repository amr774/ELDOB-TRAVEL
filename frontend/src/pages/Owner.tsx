import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useLanguage } from '../hooks/useLanguage';
import { api } from '../services/api';
import type { Booking, Car, Page, User } from '../types';
import { Feedback, LoadState, PageTitle, StatusBadge } from '../components/ui';
import { VehicleEditor } from '../features/vehicles/VehicleEditor';
import { HotelManager } from '../features/hotels/HotelManager';
interface Stats {
  users: number;
  cars: number;
  bookings: number;
  revenue: number;
  statusCounts: Record<string, number>;
  recentBookings: Booking[];
  business: {
    reservations: number;
    trips: number;
    hotels: number;
    inquiries: number;
    employees: number;
    verifiedEmployees: number;
    reservationStatusCounts: Record<string, number>;
  };
  revenueTrend: { month: string; revenue: number; payments: number }[];
}
interface Payment {
  id: string;
  amount: number;
  reference: string;
  createdAt: string;
  bookingId?: string;
  requestId?: string;
}
export function Owner() {
  const { t, money } = useLanguage();
  const cache = useQueryClient();
  const [selected, setSelected] = useState<Car | null | undefined>();
  const [page, setPage] = useState(1);
  const stats = useQuery({
    queryKey: ['owner', 'stats'],
    queryFn: async () => (await api.get<Stats>('/dashboard')).data,
  });
  const users = useQuery({
    queryKey: ['owner', 'users'],
    queryFn: async () => (await api.get<User[]>('/users')).data,
  });
  const payments = useQuery({
    queryKey: ['owner', 'payments'],
    queryFn: async () => (await api.get<Payment[]>('/payments')).data,
  });
  const bookings = useQuery({
    queryKey: ['owner', 'bookings'],
    queryFn: async () => (await api.get<Booking[]>('/bookings')).data,
  });
  const cars = useQuery({
    queryKey: ['owner', 'cars', page],
    queryFn: async () =>
      (await api.get<Page<Car>>('/cars', { params: { page, limit: 10 } })).data,
  });
  const change = useMutation({
    mutationFn: ({
      path,
      data,
      method = 'patch',
    }: {
      path: string;
      data?: unknown;
      method?: 'patch' | 'post' | 'delete';
    }) => (method === 'delete' ? api.delete(path) : api[method](path, data)),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['owner'] });
      void cache.invalidateQueries({ queryKey: ['operations'] });
    },
  });
  return (
    <div className="section">
      <div className="section-heading">
        <PageTitle
          eyebrow={t('OWNER WORKSPACE', 'مساحة المالك')}
          title={t('A clear view of your business.', 'رؤية واضحة لأعمالك.')}
        />
        <Link className="button" to="/operations">
          {t('Manage operations', 'إدارة العمليات')}
        </Link>
      </div>
      <div className="account-links">
        <a href="#overview">{t('Overview', 'نظرة عامة')}</a>
        <a href="#fleet">{t('Vehicles', 'السيارات')}</a>
        <a href="#hotels">{t('Hotels', 'الفنادق')}</a>
        <a href="#payments">{t('Payments', 'المدفوعات')}</a>
        <a href="#users">{t('People & permissions', 'الأشخاص والصلاحيات')}</a>
      </div>
      <Feedback
        error={change.error}
        success={change.isSuccess ? t('Changes saved', 'تم الحفظ') : undefined}
      />
      <HotelManager />
      <section id="overview">
        <LoadState
          loading={stats.isPending}
          error={stats.error}
          retry={() => void stats.refetch()}
        >
          {stats.data && (
            <>
              <div className="stats-grid">
                {[
                  [t('Total vehicles', 'إجمالي السيارات'), stats.data.cars],
                  [t('Customers', 'العملاء'), stats.data.users],
                  [t('Rental bookings', 'حجوزات الإيجار'), stats.data.bookings],
                  [
                    t('All reservations', 'كل الحجوزات'),
                    stats.data.business.reservations,
                  ],
                  [
                    t('Transportation requests', 'طلبات التنقل'),
                    stats.data.business.trips,
                  ],
                  [
                    t('Hotel requests', 'طلبات الفنادق'),
                    stats.data.business.hotels,
                  ],
                  [
                    t('Inquiries', 'الاستفسارات'),
                    stats.data.business.inquiries,
                  ],
                  [
                    t('Recorded revenue', 'الإيراد المسجل'),
                    money(stats.data.revenue),
                  ],
                ].map(([label, value]) => (
                  <div className="stat" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="grid two">
                <div className="panel">
                  <h2>{t('All reservation statuses', 'حالات كل الحجوزات')}</h2>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(
                          stats.data.business.reservationStatusCounts,
                        ).map(([name, count]) => ({ name, count }))}
                      >
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          fill="#b28e32"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="panel">
                  <h2>{t('Recent rentals', 'أحدث الإيجارات')}</h2>
                  {stats.data.recentBookings.map((b) => (
                    <div className="list-row" key={b.id}>
                      <div>
                        <strong>{b.user?.fullName}</strong>
                        <p>{b.car.name}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                </div>
              </div>
              <section className="panel" style={{ marginTop: 25 }}>
                <h2>
                  {t(
                    'Recorded revenue · last 6 months',
                    'الإيراد المسجل · آخر ٦ أشهر',
                  )}
                </h2>
                <p>
                  {t(
                    'Receipts across rentals, transportation and hotels, grouped by payment month in Egypt time. Booking values are not revenue.',
                    'إيصالات الإيجارات والتنقل والفنادق حسب شهر الدفع بتوقيت مصر. قيمة الحجز ليست إيراداً.',
                  )}
                </p>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.data.revenueTrend}>
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="revenue"
                        name={t('Received (EGP)', 'المستلم (جنيه)')}
                        fill="#b28e32"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('Month', 'الشهر')}</th>
                        <th>{t('Receipts', 'الإيصالات')}</th>
                        <th>{t('Revenue', 'الإيراد')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.data.revenueTrend.map((row) => (
                        <tr key={row.month}>
                          <td>{row.month}</td>
                          <td>{row.payments}</td>
                          <td>{money(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  {t('Verified employees', 'الموظفون المعتمدون')}:{' '}
                  {stats.data.business.verifiedEmployees} /{' '}
                  {stats.data.business.employees}
                </p>
              </section>
            </>
          )}
        </LoadState>
      </section>
      <section id="fleet" className="account-section">
        <div className="row">
          <h2>{t('Vehicle management', 'إدارة السيارات')}</h2>
          <button onClick={() => setSelected(null)}>
            {t('Add vehicle', 'إضافة سيارة')}
          </button>
        </div>
        {selected !== undefined && (
          <VehicleEditor
            key={selected?.id || 'new'}
            car={selected}
            close={() => setSelected(undefined)}
          />
        )}
        <LoadState
          loading={cars.isPending}
          error={cars.error}
          empty={!cars.data?.data.length}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    t('Vehicle', 'السيارة'),
                    t('Daily rate', 'السعر اليومي'),
                    t('Listing', 'العرض'),
                    t('Actions', 'الإجراءات'),
                  ].map((v) => (
                    <th key={v}>{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cars.data?.data.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{money(c.pricePerDay)}</td>
                    <td>
                      {c.available
                        ? t('Available', 'متاحة')
                        : t('Unavailable', 'غير متاحة')}
                    </td>
                    <td>
                      <button
                        className="secondary"
                        onClick={() => setSelected(c)}
                      >
                        {t('Edit', 'تعديل')}
                      </button>
                      <button
                        className="danger"
                        disabled={change.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              t(
                                `Delete ${c.name}? Existing bookings may prevent deletion.`,
                                `حذف ${c.name}؟ قد تمنع الحجوزات الحالية الحذف.`,
                              ),
                            )
                          )
                            change.mutate({
                              path: `/cars/${c.id}`,
                              method: 'delete',
                            });
                        }}
                      >
                        {t('Delete', 'حذف')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LoadState>
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            {t('Previous', 'السابق')}
          </button>
          <span>{page}</span>
          <button
            disabled={page >= (cars.data?.meta.totalPages || 1)}
            onClick={() => setPage(page + 1)}
          >
            {t('Next', 'التالي')}
          </button>
        </div>
      </section>
      <section id="payments" className="account-section">
        <h2>{t('Payments & recorded revenue', 'المدفوعات والإيراد المسجل')}</h2>
        <p>
          {t(
            'Revenue counts manual receipts recorded here. Legacy simulated payment markers are excluded. Amounts are whole EGP.',
            'يحتسب الإيراد من الإيصالات المسجلة هنا. علامات الدفع التجريبي القديمة مستبعدة. المبالغ بالجنيه الصحيح.',
          )}
        </p>
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            const target = String(d.get('target'));
            change.mutate({
              method: 'post',
              path: '/payments',
              data: {
                [target === 'booking' ? 'bookingId' : 'requestId']: d.get('id'),
                amount: Number(d.get('amount')),
                reference: d.get('reference'),
              },
            });
          }}
        >
          <div className="grid two">
            <label>
              {t('Reservation type', 'نوع الحجز')}
              <select name="target">
                <option value="booking">
                  {t('Daily rental', 'إيجار يومي')}
                </option>
                <option value="request">
                  {t('Trip / hotel request', 'طلب رحلة / فندق')}
                </option>
              </select>
            </label>
            <label>
              {t('Reservation reference', 'مرجع الحجز')}
              <input name="id" required />
            </label>
            <label>
              {t('Received amount (EGP)', 'المبلغ المستلم (جنيه)')}
              <input
                name="amount"
                type="number"
                min={1}
                max={100000000}
                required
              />
            </label>
            <label>
              {t('Unique receipt reference', 'مرجع إيصال فريد')}
              <input name="reference" maxLength={200} required />
            </label>
          </div>
          <button disabled={change.isPending}>
            {t('Record received payment', 'تسجيل الدفعة المستلمة')}
          </button>
        </form>
        <LoadState
          loading={payments.isPending}
          error={payments.error}
          empty={!payments.data?.length}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Receipt', 'الإيصال')}</th>
                  <th>{t('Reservation', 'الحجز')}</th>
                  <th>{t('Amount', 'المبلغ')}</th>
                  <th>{t('Date', 'التاريخ')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.data?.map((p) => (
                  <tr key={p.id}>
                    <td>{p.reference}</td>
                    <td>{p.bookingId || p.requestId}</td>
                    <td>{money(p.amount)}</td>
                    <td>{p.createdAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LoadState>
        <h3>{t('Rental references', 'مراجع الإيجارات')}</h3>
        <LoadState loading={bookings.isPending} error={bookings.error}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Reference', 'المرجع')}</th>
                  <th>{t('Customer', 'العميل')}</th>
                  <th>{t('Total', 'الإجمالي')}</th>
                  <th>{t('Status', 'الحالة')}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.data?.map((b) => (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td>{b.user?.fullName}</td>
                    <td>{money(b.totalPrice)}</td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LoadState>
      </section>
      <section id="users" className="account-section">
        <h2>{t('People & permissions', 'الأشخاص والصلاحيات')}</h2>
        <p>
          {t(
            'Only enable operations for verified employees. Historical employee roles may have been created through public registration.',
            'فعّل العمليات للموظفين الموثوقين فقط. قد تكون أدوار الموظفين القديمة ناتجة عن التسجيل العام.',
          )}
        </p>
        <LoadState loading={users.isPending} error={users.error}>
          <div className="grid two">
            {users.data?.map((u) => (
              <form
                className="panel"
                key={u.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  change.mutate({
                    path: `/users/${u.id}`,
                    data: {
                      fullName: d.get('fullName'),
                      phone: d.get('phone'),
                      role: d.get('role'),
                      operationsEnabled: d.get('operationsEnabled') === 'on',
                    },
                  });
                }}
              >
                <p>{u.email}</p>
                <label>
                  {t('Name', 'الاسم')}
                  <input name="fullName" defaultValue={u.fullName} required />
                </label>
                <label>
                  {t('Phone', 'الهاتف')}
                  <input name="phone" defaultValue={u.phone} />
                </label>
                <label>
                  {t('Role', 'الدور')}
                  <select name="role" defaultValue={u.role}>
                    <option value="CUSTOMER">{t('Customer', 'عميل')}</option>
                    <option value="EMPLOYEE">{t('Employee', 'موظف')}</option>
                    <option value="OWNER">{t('Owner', 'مالك')}</option>
                  </select>
                </label>
                <label className="checkbox">
                  <input
                    name="operationsEnabled"
                    type="checkbox"
                    defaultChecked={u.operationsEnabled}
                  />
                  {t(
                    'Verified employee: enable operations',
                    'موظف موثوق: تفعيل العمليات',
                  )}
                </label>
                <button disabled={change.isPending}>
                  {t('Save permissions', 'حفظ الصلاحيات')}
                </button>
              </form>
            ))}
          </div>
        </LoadState>
      </section>
    </div>
  );
}
