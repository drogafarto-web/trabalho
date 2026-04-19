import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { UnauthorizedPage } from '@/features/auth/pages/UnauthorizedPage';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { StudentLandingPage } from '@/features/student/pages/StudentLandingPage';

const router = createBrowserRouter([
  { path: '/', element: <StudentLandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/nao-autorizado', element: <UnauthorizedPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
    ],
  },
  { path: '*', element: <StudentLandingPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
