import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { apiRequest, ApiError } from "../../../shared/api";
import { getPasswordRules, isStrongPassword } from "../password-strength";

type MessageResponse = { message: string };

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rules = useMemo(() => getPasswordRules(password), [password]);
  const canSubmit =
    token.length > 0 && isStrongPassword(password) && !isSubmitting;

  const location = useLocation();
  const isActivateMode = location.pathname.includes("activar-cuenta");

  const texts = {
    eyebrow: isActivateMode ? "Activación" : "Nueva clave",
    title: isActivateMode ? "Activar tu cuenta" : "Crear nueva contraseña",
    subtitle: isActivateMode
      ? "Crea tu contraseña para activar tu cuenta de actor social."
      : "Usa una contraseña fuerte para proteger tu cuenta.",
    invalidTokenMsg: isActivateMode
      ? "El enlace no contiene un token de activación válido. Contacta con tu administrador para solicitar un nuevo enlace."
      : "El enlace no contiene un token válido. Solicita un nuevo enlace de recuperación.",
    submitBtn: isActivateMode ? "Activar cuenta" : "Restablecer contraseña",
    submittingBtn: isActivateMode ? "Activando..." : "Guardando...",
    successMsg: isActivateMode
      ? "¡Tu cuenta ha sido activada con éxito! Ya puedes iniciar sesión."
      : null,
    errorDefaultMsg: isActivateMode
      ? "No se pudo activar la cuenta."
      : "No se pudo restablecer la contraseña.",
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await apiRequest<MessageResponse>(
        "/auth/reset-password",
        {
          method: "POST",
          auth: false,
          body: { token, password },
        },
      );
      setMessage(texts.successMsg || response.message);
      setPassword("");
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : texts.errorDefaultMsg,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-layout auth-layout-centered">
      <section className="auth-card" aria-labelledby="reset-password-title">
        <div className="section-heading">
          <p className="eyebrow">{texts.eyebrow}</p>
          <h1 id="reset-password-title">{texts.title}</h1>
          <p>{texts.subtitle}</p>
        </div>

        {!token && (
          <p className="alert alert-error">
            {texts.invalidTokenMsg}
          </p>
        )}

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nueva contraseña</span>
            <input
              autoComplete="new-password"
              autoFocus
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nueva contraseña"
              required
              type="password"
              value={password}
            />
          </label>

          <ul className="password-rules" aria-label="Reglas de contraseña">
            {rules.map((rule) => (
              <li className={rule.valid ? "rule-valid" : ""} key={rule.id}>
                <span aria-hidden="true">{rule.valid ? "✓" : "•"}</span>
                {rule.label}
              </li>
            ))}
          </ul>

          {message && <p className="alert alert-success">{message}</p>}
          {error && <p className="alert alert-error">{error}</p>}

          <button
            className="button button-primary"
            disabled={!canSubmit}
            type="submit"
          >
            {isSubmitting ? texts.submittingBtn : texts.submitBtn}
          </button>
        </form>

        <Link className="text-link" to="/login">
          Volver al login
        </Link>
      </section>
    </main>
  );
}
