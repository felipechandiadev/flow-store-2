export class EShopApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EShopApiError";
    this.status = status;
  }
}

export async function parseEshopErrorResponse(
  res: Response,
): Promise<EShopApiError> {
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message
      : `eShop API error ${res.status}`;
  return new EShopApiError(message, res.status);
}
