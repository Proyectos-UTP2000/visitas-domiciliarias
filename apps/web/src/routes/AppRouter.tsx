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
import { DashboardLayout } from "../features/dashboard/layout/DashboardLayout";
import { DashboardHomePage } from "../features/dashboard/pages/DashboardHomePage";
import { MunicipalidadesPage } from "../features/municipalidades/pages/MunicipalidadesPage";
import { EntidadesPage } from "../features/entidades/pages/EntidadesPage";
import { TiposActorSocialPage } from "../features/tipos-actor-social/pages/TiposActorSocialPage";
import { CargosMiembroPage } from "../features/cargos-miembro-grupo/pages/CargosMiembroPage";
import { GruposPage } from "../features/grupos-trabajo/pages/GruposPage";
import { GrupoDetailPage } from "../features/grupos-trabajo/pages/GrupoDetailPage";
import { ActoresSocialesPage } from "../features/actores-sociales/pages/ActoresSocialesPage";
import { ActorSocialDetailPage } from "../features/actores-sociales/pages/ActorSocialDetailPage";
import { SectoresUrbanoPage } from "../features/sectores/pages/SectoresUrbanoPage";
import { SectoresRuralPage } from "../features/sectores/pages/SectoresRuralPage";
import { CentrosPobladosPage } from "../features/sectores/pages/CentrosPobladosPage";
import ResponsablesPage from "../features/responsables/pages/ResponsablesPage";
import NinosPage from "../features/ninos/pages/NinosPage";
import VisitasPage from "../features/visitas/pages/VisitasPage";
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
    <section className="admin-page-heading admin-empty-state">
      <div>
        <p className="eyebrow">Módulo V1</p>
        <h1>Próxima implementación modular</h1>
        <p>
          Esta ruta ya está reservada. El CRUD se implementará en su feature
          correspondiente sin mezclar responsabilidades con autenticación.
        </p>
      </div>
    </section>
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
        <Route element={<ResetPasswordPage />} path="/activar-cuenta" />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route element={<DashboardHomePage />} path="/" />
            <Route element={<MunicipalidadesPage />} path="/municipalidades" />
            <Route element={<EntidadesPage />} path="/entidades" />
            <Route element={<TiposActorSocialPage />} path="/tipos-actor-social" />
            <Route element={<CargosMiembroPage />} path="/cargos-miembro-grupo" />
            <Route element={<GruposPage />} path="/grupos-trabajo" />
            <Route element={<GrupoDetailPage />} path="/grupos-trabajo/:id" />
            <Route element={<Navigate replace to="/sectores/urbano" />} path="/sectores" />
            <Route element={<CentrosPobladosPage />} path="/sectores/centro-poblado" />
            <Route element={<SectoresUrbanoPage />} path="/sectores/urbano" />
            <Route element={<SectoresRuralPage />} path="/sectores/rural" />
            <Route element={<ActoresSocialesPage />} path="/actores-sociales" />
            <Route element={<ActorSocialDetailPage />} path="/actores-sociales/nuevo" />
            <Route element={<ActorSocialDetailPage />} path="/actores-sociales/:id" />
            <Route element={<ResponsablesPage />} path="/responsables" />
            <Route element={<NinosPage />} path="/ninos" />
            <Route element={<VisitasPage />} path="/ninos/visitas" />
            <Route element={<ComingSoonPage />} path="/reportes/actividad" />
            <Route element={<ComingSoonPage />} path="/reportes/operativos" />
          </Route>
        </Route>

        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </BrowserRouter>
  );
}
