import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { UnauthorizedPage } from '@/features/auth/pages/UnauthorizedPage';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { DisciplinesListPage } from '@/features/disciplines/pages/DisciplinesListPage';
import { DisciplineDetailPage } from '@/features/disciplines/pages/DisciplineDetailPage';
import { StudentsListPage } from '@/features/students/pages/StudentsListPage';
import { ReportsPage } from '@/features/reports/pages/ReportsPage';
import { ConfigPage } from '@/features/config/pages/ConfigPage';
import { SubmissionFormPage } from '@/features/submission/pages/SubmissionFormPage';

// Lazy — carrega `xlsx` (~700KB) só quando o professor navega pra /importar
const ImportPage = lazy(() =>
  import('@/features/import/pages/ImportPage').then((m) => ({ default: m.ImportPage })),
);

const router = createBrowserRouter([
  { path: '/', element: <SubmissionFormPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/nao-autorizado', element: <UnauthorizedPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard',         element: <DashboardPage /> },
      { path: '/disciplinas',       element: <DisciplinesListPage /> },
      { path: '/disciplinas/:id',   element: <DisciplineDetailPage /> },
      { path: '/alunos',            element: <StudentsListPage /> },
      { path: '/relatorios',        element: <ReportsPage /> },
      { path: '/config',            element: <ConfigPage /> },
      {
        path: '/importar',
        element: (
          <Suspense fallback={null}>
            <ImportPage />
          </Suspense>
        ),
      },
    ],
  },
  { path: '*', element: <SubmissionFormPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
