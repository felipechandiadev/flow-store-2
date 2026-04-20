import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { LoginCommandHandler } from '@modules/auth/application/handlers/commands/login.handler';
import { LoginCommand } from '@modules/auth/application/commands/login.command';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '@modules/auth/application/ports/auth.repository.port';

describe('LoginCommandHandler', () => {
  let handler: LoginCommandHandler;
  let authRepository: jest.Mocked<AuthRepositoryPort>;
  let eventBus: EventBus;

  const mockUser = {
    id: 'user-id',
    userName: 'testuser',
    pass: bcrypt.hashSync('password', 10),
    rol: 'admin',
    person: {
      id: 'person-id',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '123456789',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginCommandHandler,
        {
          provide: AUTH_REPOSITORY,
          useValue: {
            findUserByUsername: jest.fn(),
            saveUser: jest.fn(),
          },
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<LoginCommandHandler>(LoginCommandHandler);
    authRepository = module.get(AUTH_REPOSITORY);
    eventBus = module.get<EventBus>(EventBus);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should login successfully with valid credentials', async () => {
      const command = new LoginCommand('testuser', 'password');

      jest
        .spyOn(authRepository, 'findUserByUsername')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(eventBus, 'publish').mockImplementation();

      const result = await handler.execute(command);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.userName).toBe('testuser');
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid user', async () => {
      const command = new LoginCommand('invaliduser', 'password');

      jest.spyOn(authRepository, 'findUserByUsername').mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const command = new LoginCommand('testuser', 'wrongpassword');

      jest
        .spyOn(authRepository, 'findUserByUsername')
        .mockResolvedValue(mockUser as any);

      await expect(handler.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
