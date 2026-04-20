import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Shareholder } from '../domain/shareholder.entity';

@Injectable()
export class ShareholdersService {
  constructor(
    @InjectRepository(Shareholder)
    private readonly shareholderRepository: Repository<Shareholder>,
  ) {}

  /**
   * List all shareholders
   */
  async listShareholders() {
    try {
      const shareholders = await this.shareholderRepository.find({
        where: { deletedAt: IsNull() },
        relations: { person: true },
      });

      return (shareholders || []).map((shareholder) => {
        if (!shareholder.person) {
          return shareholder;
        }

        const displayName =
          shareholder.person.businessName?.trim() ||
          [shareholder.person.firstName, shareholder.person.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();

        return {
          ...shareholder,
          person: {
            ...shareholder.person,
            displayName,
          },
        };
      });
    } catch (error) {
      console.error('Error fetching shareholders:', error);
      return [];
    }
  }
}
