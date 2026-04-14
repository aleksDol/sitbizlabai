export const ADMIN_SESSION_COOKIE = "admin_session";

function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim() ?? "";
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

export function getAdminSessionValue(): string {
  const email = getAdminEmail();
  const password = getAdminPassword();

  if (!email || !password) {
    return "";
  }

  return `${email}:${password}`;
}

export function isAdminSessionValue(value: string | undefined): boolean {
  const expected = getAdminSessionValue();
  return Boolean(expected) && value === expected;
}

export function areAdminCredentialsValid(email: string, password: string): boolean {
  const expectedEmail = getAdminEmail();
  const expectedPassword = getAdminPassword();

  if (!expectedEmail || !expectedPassword) {
    return false;
  }

  return email === expectedEmail && password === expectedPassword;
}
