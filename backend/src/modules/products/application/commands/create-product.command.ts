import { BaseCommand } from '@shared/cqrs';

export class CreateProductCommand extends BaseCommand {
  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly categoryId?: string,
    public readonly brand?: string,
    public readonly description?: string,
    public readonly isActive: boolean = true,
  ) {
    super();
  }
}
