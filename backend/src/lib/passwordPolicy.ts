// Single password policy for every path that sets a user-chosen password.
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;
export const PASSWORD_RULES_TEXT = `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters and include a letter and a number, and must not contain your email name.`;

export function validatePassword(password: unknown, email?: string): string | null {
  if (typeof password !== 'string') return PASSWORD_RULES_TEXT;
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return PASSWORD_RULES_TEXT;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return PASSWORD_RULES_TEXT;
  // must not embed the account's own name: whole local-part or any 4+ character token of it
  const local = (email || '').split('@')[0].toLowerCase();
  const tokens = [local, ...local.split(/[^a-z0-9]+/)].filter(t => t.length >= 4);
  const lower = password.toLowerCase();
  if (tokens.some(t => lower.includes(t))) return PASSWORD_RULES_TEXT;
  return null;
}
