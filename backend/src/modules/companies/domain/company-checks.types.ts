/**
 * Configuración de cheques para una empresa.
 *
 * Se persiste dentro de `companies.settings.checks` (columna JSON), por lo
 * que NO requiere migración propia y puede evolucionar sin cambios de
 * schema.
 *
 * - `enabled`: master switch. Si está en false, ninguna ruta de cheques
 *   (POS, gastos, cartera) está habilitada.
 * - `receiveChecks`: la empresa acepta cheques como pago entrante. Se
 *   refleja en el catálogo `paymentMethods` (entrada CHECK isActive).
 * - `issueChecks`: la empresa emite cheques en pagos a proveedores/gastos.
 * - `allowPostdated`: permite cheques "a fecha" (con `dueDate`).
 * - `defaultDepositBankAccountKey`: cuenta sugerida al depositar un
 *   cheque entrante.
 * - `defaultIssueBankAccountKey`: cuenta sobre la que se gira al emitir
 *   cheques salientes.
 */
export interface CompanyCheckSettings {
  enabled: boolean;
  receiveChecks: boolean;
  issueChecks: boolean;
  allowPostdated: boolean;
  defaultDepositBankAccountKey: string | null;
  defaultIssueBankAccountKey: string | null;
}

export function buildDefaultCompanyCheckSettings(): CompanyCheckSettings {
  return {
    enabled: false,
    receiveChecks: false,
    issueChecks: false,
    allowPostdated: false,
    defaultDepositBankAccountKey: null,
    defaultIssueBankAccountKey: null,
  };
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/**
 * Normaliza un payload arbitrario en `CompanyCheckSettings`. Mantiene
 * coerciones laxas (acepta `0/1`, `"true"/"false"`) para tolerar clientes
 * que no envíen tipos exactos.
 */
export function sanitizeCompanyCheckSettings(
  raw: unknown,
): CompanyCheckSettings {
  const r = (raw ?? {}) as Partial<CompanyCheckSettings> & {
    [k: string]: unknown;
  };
  const truthy = (v: unknown): boolean =>
    v === true || v === 1 || v === '1' || v === 'true';

  const enabled = truthy(r.enabled);
  const receiveChecks = enabled && truthy(r.receiveChecks);
  const issueChecks = enabled && truthy(r.issueChecks);
  const allowPostdated = enabled && truthy(r.allowPostdated);

  return {
    enabled,
    receiveChecks,
    issueChecks,
    allowPostdated,
    defaultDepositBankAccountKey: trimOrNull(r.defaultDepositBankAccountKey),
    defaultIssueBankAccountKey: trimOrNull(r.defaultIssueBankAccountKey),
  };
}
