export type PasswordRule = {
  id: string;
  label: string;
  valid: boolean;
};

export function getPasswordRules(password: string): PasswordRule[] {
  return [
    {
      id: "length",
      label: "Mínimo 8 caracteres",
      valid: password.length >= 8,
    },
    {
      id: "uppercase",
      label: "Al menos una mayúscula",
      valid: /[A-Z]/.test(password),
    },
    {
      id: "lowercase",
      label: "Al menos una minúscula",
      valid: /[a-z]/.test(password),
    },
    {
      id: "number",
      label: "Al menos un número",
      valid: /\d/.test(password),
    },
    {
      id: "special",
      label: "Al menos un carácter especial (_, $, *, @, #)",
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function isStrongPassword(password: string) {
  return getPasswordRules(password).every((rule) => rule.valid);
}
