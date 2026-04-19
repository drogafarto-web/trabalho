import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { UnauthorizedPage } from '@/features/auth/pages/UnauthorizedPage';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { DisciplinesListPage } from '@/features/disciplines/pages/DisciplinesListPage';
import { StudentsListPage } from '@/features/students/pages/StudentsListPage';
import { SubmissionFormPage } from '@/features/submission/pages/SubmissionFormPage';

const router = createBrowserRouter([
  { path: '/', element: <SubmissionFormPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/nao-autorizado', element: <UnauthorizedPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard',   element: <DashboardPage /> },
      { path: '/disciplinas', element: <DisciplinesListPage /> },
      { path: '/alunos',      element: <StudentsListPage /> },
    ],
  },
  { path: '*', element: <SubmissionFormPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
