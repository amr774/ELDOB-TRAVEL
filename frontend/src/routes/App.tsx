import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Layout } from '../layouts/Layout';
import { WorkspaceLayout } from '../layouts/WorkspaceLayout';
import { Home } from '../pages/Home';
import { Cars } from '../pages/Cars';
import { Hotels } from '../pages/Hotels';
const HotelDetails = lazy(() =>
  import('../pages/HotelDetails').then((m) => ({ default: m.HotelDetails })),
);
const CarDetails = lazy(() =>
  import('../pages/CarDetails').then((module) => ({
    default: module.CarDetails,
  })),
);
import { About, Contact, Services } from '../pages/Information';
const Auth = lazy(() =>
  import('../pages/Auth').then((module) => ({ default: module.Auth })),
);
const Account = lazy(() =>
  import('../pages/Account').then((module) => ({ default: module.Account })),
);
import { RequestForm } from '../pages/RequestForm';
const Operations = lazy(() =>
  import('../pages/Operations').then((module) => ({
    default: module.Operations,
  })),
);
const Owner = lazy(() =>
  import('../pages/Owner').then((module) => ({ default: module.Owner })),
);
import { useAuth } from '../features/auth/AuthProvider';
import { useLanguage } from '../hooks/useLanguage';
function Protected({
  owner = false,
  operations = false,
}: {
  owner?: boolean;
  operations?: boolean;
}) {
  const { user, ready } = useAuth();
  const { t } = useLanguage();
  if (!ready)
    return (
      <p className="empty" role="status">
        {t('Checking session…', 'جارٍ التحقق…')}
      </p>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (
    (owner && user.role !== 'OWNER') ||
    (operations &&
      user.role !== 'OWNER' &&
      !(user.role === 'EMPLOYEE' && user.operationsEnabled))
  )
    return <Navigate to="/account" replace />;
  return <Outlet />;
}
export function App() {
  const location = useLocation();
  const { t } = useLanguage();
  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);
  return (
    <Suspense
      fallback={
        <p className="empty" role="status">
          {t('Loading…', 'جارٍ التحميل…')}
        </p>
      }
    >
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="cars" element={<Cars />} />
          <Route path="hotels" element={<Hotels />} />
          <Route path="hotels/:id" element={<HotelDetails />} />
          <Route
            path="requests/hotel"
            element={<Navigate to="/hotels" replace />}
          />
          <Route path="cars/:id" element={<CarDetails />} />
          <Route path="services" element={<Services />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Auth />} />
          <Route path="register" element={<Auth register />} />
          <Route path="requests/:kind" element={<RequestForm />} />
          <Route element={<Protected />}>
            <Route path="account" element={<Account />} />
          </Route>
        </Route>
        <Route element={<Protected operations />}>
          <Route element={<WorkspaceLayout />}>
            <Route path="operations" element={<Operations />} />
            <Route element={<Protected owner />}>
              <Route path="owner" element={<Owner />} />
            </Route>
          </Route>
        </Route>
        <Route element={<Layout />}>
          <Route
            path="*"
            element={
              <div className="section">
                <h1>404</h1>
                <p>
                  {t(
                    'This destination could not be found.',
                    'لم نعثر على هذه الصفحة.',
                  )}
                </p>
              </div>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
