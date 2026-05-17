import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";

type UnitRow = { id: string; active: boolean };
type PriceListRow = { id: string; isActive: boolean; isDefault: boolean };
type TaxRow = { id: string; taxType: string; rate: number; isDefault: boolean; isActive: boolean };

async function parseError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const m = data.message;
  if (Array.isArray(m)) return m.map(String).join("; ");
  if (typeof m === "string" && m.trim()) return m.trim();
  return res.statusText;
}

function parseUnits(json: unknown): UnitRow[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      if (!id) return null;
      return { id, active: o.active !== false };
    })
    .filter((x): x is UnitRow => x != null);
}

function parsePriceLists(json: unknown): PriceListRow[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      if (!id) return null;
      return {
        id,
        isActive: o.isActive !== false,
        isDefault: o.isDefault === true,
      };
    })
    .filter((x): x is PriceListRow => x != null);
}

function parseTaxes(json: unknown): TaxRow[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      const taxType = o.taxType != null ? String(o.taxType) : "";
      if (!id || !taxType) return null;
      const rateRaw = o.rate;
      const rate =
        typeof rateRaw === "number"
          ? rateRaw
          : rateRaw != null
            ? Number(rateRaw)
            : 0;
      return {
        id,
        taxType,
        rate: Number.isFinite(rate) ? rate : 0,
        isDefault: o.isDefault === true,
        isActive: o.isActive !== false,
      };
    })
    .filter((x): x is TaxRow => x != null);
}

export type CatalogDefaults = {
  unitId: string;
  priceListId: string;
  defaultIvaTaxIds: string[];
  taxes: TaxRow[];
};

export class CatalogRequest {
  static async resolveDefaults(): Promise<
    { success: true; defaults: CatalogDefaults } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const [unitsRes, priceListsRes, taxesRes] = await Promise.all([
        fetch(apiUrl("units"), { method: "GET", headers, cache: "no-store" }),
        fetch(apiUrl("price-lists?includeInactive=true"), {
          method: "GET",
          headers,
          cache: "no-store",
        }),
        fetch(apiUrl("taxes"), { method: "GET", headers, cache: "no-store" }),
      ]);

      if (!unitsRes.ok) {
        return { success: false, error: await parseError(unitsRes) };
      }
      if (!priceListsRes.ok) {
        return { success: false, error: await parseError(priceListsRes) };
      }
      if (!taxesRes.ok) {
        return { success: false, error: await parseError(taxesRes) };
      }

      const units = parseUnits(await unitsRes.json());
      const priceLists = parsePriceLists(await priceListsRes.json());
      const taxes = parseTaxes(await taxesRes.json());

      const unit = units.find((u) => u.active) ?? null;
      if (!unit) {
        return {
          success: false,
          error: "No hay unidad de medida activa. Configúrala en el admin.",
        };
      }

      const activePriceLists = priceLists.filter((p) => p.isActive);
      const priceListId =
        activePriceLists.find((p) => p.isDefault)?.id ?? activePriceLists[0]?.id ?? null;
      if (!priceListId) {
        return { success: false, error: "No hay lista de precios activa." };
      }

      const iva = taxes.filter((t) => t.isActive && t.taxType === "IVA");
      const defaultIvaTaxIds = iva.filter((t) => t.isDefault).map((t) => t.id);
      const taxIds =
        defaultIvaTaxIds.length > 0 ? defaultIvaTaxIds : iva[0]?.id ? [iva[0].id] : [];

      return {
        success: true,
        defaults: {
          unitId: unit.id,
          priceListId,
          defaultIvaTaxIds: taxIds,
          taxes,
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar catálogo",
      };
    }
  }
}
