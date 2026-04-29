export const USER_ROLES = ["admin", "dispatch", "officer", "civilian"] as const;

export type UserRole = (typeof USER_ROLES)[number];

const STEAM_HEX_PATTERN = /^(steam:)?[0-9a-f]{8,32}$/i;

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidSteamHex(value: string) {
  return STEAM_HEX_PATTERN.test(value.trim());
}
