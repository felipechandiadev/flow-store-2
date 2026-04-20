import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../presentation/users.controller';
import { UsersServiceAdapter } from '../application/users.service.adapter';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersServiceAdapter;

  const mockUsersService = {
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    removeUser: jest.fn(),
    changePassword: jest.fn(),
    changeOwnPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersServiceAdapter,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersServiceAdapter>(UsersServiceAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return all users without search', async () => {
      const mockUsers = [
        { id: 'user-1', userName: 'john', mail: 'john@example.com' },
        { id: 'user-2', userName: 'jane', mail: 'jane@example.com' },
      ];

      mockUsersService.getAllUsers.mockResolvedValue(mockUsers);

      const result = await controller.getUsers();

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.getAllUsers).toHaveBeenCalledWith(undefined);
    });

    it('should return users matching search term', async () => {
      const mockUsers = [
        { id: 'user-1', userName: 'john', mail: 'john@example.com' },
      ];

      mockUsersService.getAllUsers.mockResolvedValue(mockUsers);

      const result = await controller.getUsers('john');

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.getAllUsers).toHaveBeenCalledWith('john');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user-1',
        userName: 'john',
        mail: 'john@example.com',
      };

      mockUsersService.getUserById.mockResolvedValue(mockUser);

      const result = await controller.getUserById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.getUserById).toHaveBeenCalledWith('user-1');
    });

    it('should return 404 when user not found', async () => {
      mockUsersService.getUserById.mockResolvedValue(null);

      const result = await controller.getUserById('nonexistent');

      expect(result).toEqual({
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    });
  });

  describe('createUser', () => {
    it('should create user with minimal data', async () => {
      const createData = {
        userName: 'newuser',
        mail: 'newuser@example.com',
        password: 'securepassword',
      };

      const createdUser = {
        id: 'user-3',
        ...createData,
      };

      mockUsersService.createUser.mockResolvedValue(createdUser);

      const result = await controller.createUser(createData);

      expect(result).toEqual(createdUser);
      expect(mockUsersService.createUser).toHaveBeenCalledWith(createData);
    });

    it('should create user with person data', async () => {
      const createData = {
        userName: 'newuser',
        mail: 'newuser@example.com',
        password: 'securepassword',
        person: {
          type: 'individual',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '1234567890',
        },
      };

      const createdUser = {
        id: 'user-3',
        ...createData,
      };

      mockUsersService.createUser.mockResolvedValue(createdUser);

      const result = await controller.createUser(createData);

      expect(mockUsersService.createUser).toHaveBeenCalledWith(createData);
    });
  });

  describe('updateUser', () => {
    it('should update user with new username', async () => {
      const updateData = {
        userName: 'updateduser',
      };

      const updatedUser = {
        id: 'user-1',
        userName: 'updateduser',
        mail: 'john@example.com',
      };

      mockUsersService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser('user-1', updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        'user-1',
        updateData,
      );
    });

    it('should update user with multiple fields', async () => {
      const updateData = {
        userName: 'updateduser',
        mail: 'newemail@example.com',
        rol: 'admin',
        phone: '9876543210',
      };

      const updatedUser = {
        id: 'user-1',
        ...updateData,
      };

      mockUsersService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser('user-1', updateData);

      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        'user-1',
        updateData,
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const mockResponse = { success: true };

      mockUsersService.removeUser.mockResolvedValue(mockResponse);

      const result = await controller.deleteUser('user-1');

      expect(result).toEqual(mockResponse);
      expect(mockUsersService.removeUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      const passwordData = { password: 'newpassword' };
      const mockResponse = { success: true };

      mockUsersService.changePassword.mockResolvedValue(mockResponse);

      const result = await controller.changePassword('user-1', passwordData);

      expect(result).toEqual(mockResponse);
      expect(mockUsersService.changePassword).toHaveBeenCalledWith(
        'user-1',
        passwordData,
      );
    });
  });

  describe('changeOwnPassword', () => {
    it('should change current user password', async () => {
      const passwordData = {
        currentUserId: 'user-1',
        newPassword: 'newpassword',
      };

      const mockResponse = { success: true };

      mockUsersService.changeOwnPassword.mockResolvedValue(mockResponse);

      const result = await controller.changeOwnPassword(passwordData);

      expect(result).toEqual(mockResponse);
      expect(mockUsersService.changeOwnPassword).toHaveBeenCalledWith(
        passwordData,
      );
    });
  });
});
