import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Person, PersonType, PersonBankAccount } from '../domain/person.entity';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonBankAccountDto } from './dto/person-bank-account.dto';
import { ListPersonsDto } from './dto/list-persons.dto';

@Injectable()
export class PersonsService {
  constructor(
    @InjectRepository(Person)
    private readonly personsRepository: Repository<Person>,
  ) {}

  /**
   * Search persons with filters
   * @param term - Search term for firstName, lastName, businessName, documentNumber
   * @param limit - Maximum results to return
   * @param type - PersonType filter (NATURAL or COMPANY)
   */
  async findAll(params?: ListPersonsDto) {
    const { term, limit = 50, type, includeInactive = false } = params || {};

    const queryBuilder = this.personsRepository.createQueryBuilder('person');

    // Apply soft-delete filter
    if (!includeInactive) {
      queryBuilder.andWhere('person.deletedAt IS NULL');
    } else {
      queryBuilder.withDeleted();
    }

    // Apply PersonType filter
    if (type) {
      queryBuilder.andWhere('person.type = :type', { type });
    }

    // Apply search term filter
    if (term && term.trim()) {
      const searchTerm = `%${term.trim()}%`;
      queryBuilder.andWhere(
        '(person.firstName LIKE :searchTerm ' +
          'OR person.lastName LIKE :searchTerm ' +
          'OR person.businessName LIKE :searchTerm ' +
          'OR person.documentNumber LIKE :searchTerm)',
        { searchTerm },
      );
    }

    // Apply limit
    if (limit && limit > 0) {
      queryBuilder.limit(limit);
    }

    // Order by name
    queryBuilder.orderBy('person.firstName', 'ASC');

    return await queryBuilder.getMany();
  }

  /**
   * Find a person by ID
   */
  async findOne(id: string, includeInactive = false) {
    const queryBuilder = this.personsRepository
      .createQueryBuilder('person')
      .where('person.id = :id', { id });

    if (includeInactive) {
      queryBuilder.withDeleted();
    }

    const person = await queryBuilder.getOne();

    if (!person) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    return person;
  }

  /**
   * Create a new person
   */
  async create(data: CreatePersonDto) {
    const person = this.personsRepository.create(data);
    return await this.personsRepository.save(person);
  }

  /**
   * Update a person
   */
  async update(id: string, data: UpdatePersonDto) {
    const person = await this.findOne(id);

    Object.assign(person, data);

    return await this.personsRepository.save(person);
  }

  /**
   * Soft-delete a person
   */
  async remove(id: string) {
    const person = await this.findOne(id);
    await this.personsRepository.softRemove(person);
    return { message: 'Person deleted successfully' };
  }

  /**
   * Add bank account to person
   */
  async addBankAccount(personId: string, accountData: PersonBankAccountDto) {
    const person = await this.findOne(personId);

    // Initialize bankAccounts if null
    if (!person.bankAccounts) {
      person.bankAccounts = [];
    }

    // Generate unique account key
    const accountKey = `${accountData.bankName}_${accountData.accountNumber}_${Date.now()}`;
    const newAccount: PersonBankAccount = {
      ...accountData,
      accountKey,
    };

    // If this is marked as primary, unmark others
    if (newAccount.isPrimary) {
      person.bankAccounts = person.bankAccounts.map((acc) => ({
        ...acc,
        isPrimary: false,
      }));
    }

    // Add new account
    person.bankAccounts.push(newAccount);

    const savedPerson = await this.personsRepository.save(person);

    return savedPerson;
  }

  /**
   * Remove bank account from person
   */
  async removeBankAccount(personId: string, accountKey: string) {
    const person = await this.findOne(personId);

    if (!person.bankAccounts || person.bankAccounts.length === 0) {
      throw new NotFoundException('No bank accounts found for this person');
    }

    const accountIndex = person.bankAccounts.findIndex(
      (acc) => acc.accountKey === accountKey,
    );

    if (accountIndex === -1) {
      throw new NotFoundException(
        `Bank account with key ${accountKey} not found`,
      );
    }

    // Remove account
    person.bankAccounts.splice(accountIndex, 1);

    await this.personsRepository.save(person);

    return { message: 'Bank account removed successfully' };
  }
}
