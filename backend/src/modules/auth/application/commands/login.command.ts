import { BaseCommand } from '@shared/cqrs';

export class LoginCommand extends BaseCommand {
  constructor(
    public readonly userName: string,
    public readonly password: string,
  ) {
    super();
  }
}
