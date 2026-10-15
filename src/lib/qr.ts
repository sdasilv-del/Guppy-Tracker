// A tank's QR code holds a link into the app, e.g. guppytracker://tanks/<uuid>.
// Scanning it with the in-app scanner, or with the phone camera once the app is installed, opens that tank.

export function tankLink(tankId: string): string {
  return `guppytracker://tanks/${tankId}`;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function tankIdFromCode(data: string): string | null {
  const match = data.match(UUID);
  return match ? match[0].toLowerCase() : null;
}
