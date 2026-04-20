import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersServiceAdapter } from '../application/users.service.adapter';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  ChangeOwnPasswordDto,
} from '../application/dto/user.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersServiceAdapter) {}

  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve a list of all users with optional search filter',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter users by name, username, or email',
    example: 'john',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userName: { type: 'string' },
          mail: { type: 'string' },
          rol: { type: 'string' },
          isActive: { type: 'boolean' },
          person: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getUsers(@Query('search') search?: string) {
    return this.usersService.getAllUsers(search);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve detailed information about a specific user',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'uuid-1234-5678-9012',
  })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userName: { type: 'string' },
        mail: { type: 'string' },
        rol: { type: 'string' },
        isActive: { type: 'boolean' },
        person: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'User not found' },
        statusCode: { type: 'number', example: 404 },
      },
    },
  })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.getUserById(id);
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }
    return user;
  }

  @Post()
  @ApiOperation({
    summary: 'Create new user',
    description: 'Create a new user account with optional person information',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'User creation data',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userName: { type: 'string' },
        mail: { type: 'string' },
        rol: { type: 'string' },
        person: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or user already exists',
  })
  async createUser(@Body() data: CreateUserDto) {
    return this.usersService.createUser(data);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user information',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to update',
    example: 'uuid-1234-5678-9012',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'User update data',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(@Param('id') id: string, @Body() data: UpdateUserDto) {
    return this.usersService.updateUser(id, data);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Soft delete a user account',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to delete',
    example: 'uuid-1234-5678-9012',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.removeUser(id);
  }

  @Put(':id/password')
  @ApiOperation({
    summary: 'Change user password',
    description: 'Change password for a specific user (admin operation)',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'uuid-1234-5678-9012',
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'New password data',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(
    @Param('id') id: string,
    @Body() data: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(id, data);
  }

  @Put('password')
  @ApiOperation({
    summary: 'Change own password',
    description: 'Change the current authenticated user password',
  })
  @ApiBody({
    type: ChangeOwnPasswordDto,
    description: 'Current user ID and new password',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  async changeOwnPassword(@Body() data: ChangeOwnPasswordDto) {
    return this.usersService.changeOwnPassword(data);
  }
}
