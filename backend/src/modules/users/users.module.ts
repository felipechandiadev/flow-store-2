import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { User } from './domain/user.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { UsersService } from './application/users.service';
import { UsersServiceAdapter } from './application/users.service.adapter';
import { UsersController } from './presentation/users.controller';

// CQRS Imports
import { CreateUserCommandHandler } from './application/handlers/commands/create-user.handler';
import { UpdateUserCommandHandler } from './application/handlers/commands/update-user.handler';
import { RemoveUserCommandHandler } from './application/handlers/commands/remove-user.handler';
import { ChangeUserPasswordCommandHandler } from './application/handlers/commands/change-user-password.handler';
import { TypeOrmUserRepository } from './infrastructure/repositories/typeorm-user.repository';
import { UsersSchemaBootstrap } from './infrastructure/users-schema.bootstrap';

import { GetAllUsersQueryHandler } from './application/handlers/queries/get-all-users.handler';
import { GetUserQueryHandler } from './application/handlers/queries/get-user.handler';

@Module({
  imports: [TypeOrmModule.forFeature([User, Person]), CqrsModule],
  controllers: [UsersController],
  providers: [
    // Legacy service for backward compatibility
    UsersService,
    // CQRS Service Adapter
    UsersServiceAdapter,
    // CQRS Command Handlers
    CreateUserCommandHandler,
    UpdateUserCommandHandler,
    RemoveUserCommandHandler,
    ChangeUserPasswordCommandHandler,
    // CQRS Query Handlers
    GetAllUsersQueryHandler,
    GetUserQueryHandler,
    UsersSchemaBootstrap,
    {
      provide: 'UserRepositoryPort',
      useClass: TypeOrmUserRepository,
    },
  ],
  exports: [
    UsersService,
    UsersServiceAdapter,
    {
      provide: 'UserRepositoryPort',
      useClass: TypeOrmUserRepository,
    },
  ],
})
export class UsersModule {}
