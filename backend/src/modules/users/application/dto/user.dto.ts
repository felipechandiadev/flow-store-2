import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Username for the user',
    example: 'johndoe',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  mail: string;

  @ApiProperty({
    description: 'User password',
    example: 'securePassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'User role',
    example: 'USER',
    enum: ['ADMIN', 'USER', 'MANAGER'],
  })
  @IsOptional()
  @IsString()
  rol?: string;

  @ApiPropertyOptional({
    description: 'Existing person ID to link',
    example: 'uuid-1234-5678',
  })
  @IsOptional()
  @IsString()
  personId?: string;

  @ApiPropertyOptional({
    description: 'Person information (if creating new person)',
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['NATURAL', 'LEGAL'], example: 'NATURAL' },
      firstName: { type: 'string', example: 'John' },
      lastName: { type: 'string', example: 'Doe' },
      businessName: { type: 'string', example: 'ACME Corp' },
      documentType: {
        type: 'string',
        enum: ['CC', 'NIT', 'PASSPORT'],
        example: 'CC',
      },
      documentNumber: { type: 'string', example: '123456789' },
      email: {
        type: 'string',
        format: 'email',
        example: 'john.doe@example.com',
      },
      phone: { type: 'string', example: '+1234567890' },
      address: { type: 'string', example: '123 Main St, City, Country' },
    },
  })
  person?: {
    type?: string;
    firstName: string;
    lastName?: string;
    businessName?: string;
    documentType?: string;
    documentNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'New username',
    example: 'johndoe_updated',
  })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({
    description: 'New email address',
    example: 'john.doe.updated@example.com',
  })
  @IsOptional()
  @IsEmail()
  mail?: string;

  @ApiPropertyOptional({
    description: 'New user role',
    example: 'MANAGER',
    enum: ['ADMIN', 'USER', 'MANAGER'],
  })
  @IsOptional()
  @IsString()
  rol?: string;

  @ApiPropertyOptional({
    description: 'New phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'New person name',
    example: 'John Doe Updated',
  })
  @IsOptional()
  @IsString()
  personName?: string;

  @ApiPropertyOptional({
    description: 'New person document number',
    example: '987654321',
  })
  @IsOptional()
  @IsString()
  personDni?: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'New password',
    example: 'newSecurePassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class ChangeOwnPasswordDto {
  @ApiProperty({
    description: 'Current user ID',
    example: 'uuid-1234-5678',
  })
  @IsString()
  currentUserId?: string;

  @ApiProperty({
    description: 'New password',
    example: 'newSecurePassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword?: string;
}
