import { BaseCommand } from '@shared/cqrs';

export class LoginCommand extends BaseCommand {
  constructor(
    public readonly userName: string,
    public readonly password: string,
    /**
     * Empresa solicitada por el cliente al hacer login.
     * Se envía típicamente desde el POS (NEXT_PUBLIC_COMPANY_ID) como header
     * X-Active-Company-Id. Si está presente:
     *  - OPERATOR: debe coincidir con user.companyId, si no se rechaza.
     *  - ADMIN: debe ser una empresa activa válida; se usa como activa.
     */
    public readonly companyHint?: string | null,
  ) {
    super();
  }
}
