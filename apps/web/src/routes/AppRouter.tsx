import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  AUTH_SESSION_EXPIRED_EVENT,
  clearStoredSession,
} from "../features/auth/auth-storage";
import { ForgotPasswordPage } from "../features/auth/pages/ForgotPasswordPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { ResetPasswordPage } from "../features/auth/pages/ResetPasswordPage";
import { DashboardHomePage } from "../features/dashboard/pages/DashboardHomePage";
import { ProtectedRoute } from "./ProtectedRoute";

function SessionExpirationListener() {
  const navigate = useNavigate();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function handleExpiredSession() {
      clearStoredSession();
      setExpired(true);
      navigate("/login", { replace: true });
    }

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
    return () =>
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        handleExpiredSession,
      );
  }, [navigate]);

  return expired ? (
    <div className="toast" role="status">
      Tu sesión expiró. Ingresa nuevamente.
    </div>
  ) : null;
}

function ComingSoonPage() {
  return (
    <main className="dashboard-shell">
      <section className="empty-state">
        <p className="eyebrow">Módulo V1</p>
        <h1>Próxima implementación modular</h1>
        <p>
          Esta ruta ya está reservada. El CRUD se implementará en su feature
          correspondiente sin mezclar responsabilidades con autenticación.
        </p>
      </section>
    </main>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <SessionExpirationListener />
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<ForgotPasswordPage />} path="/forgot-password" />
        <Route element={<ResetPasswordPage />} path="/reset-password" />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardHomePage />} path="/" />
          <Route element={<ComingSoonPage />} path="/municipalidades" />
          <Route element={<ComingSoonPage />} path="/entidades" />
          <Route element={<ComingSoonPage />} path="/tipos-actor-social" />
          <Route element={<ComingSoonPage />} path="/cargos-miembro-grupo" />
          <Route element={<ComingSoonPage />} path="/grupos-trabajo" />
          <Route element={<ComingSoonPage />} path="/sectores" />
          <Route element={<ComingSoonPage />} path="/actores-sociales" />
        </Route>

        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </BrowserRouter>
  );
}
