export type FieldErrors<T extends string> = Partial<Record<T, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+()\s.-]{8,20}$/;

export function isValidEmail(value: string) {
  return emailPattern.test(value.trim());
}

export function isValidPhone(value: string) {
  return phonePattern.test(value.trim());
}
