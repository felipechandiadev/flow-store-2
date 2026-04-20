import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description: 'Login success status',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'User information (only present on successful login)',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'uuid-1234' },
      userName: { type: 'string', example: 'admin' },
      email: { type: 'string', example: 'admin@flowstore.com' },
      rol: { type: 'string', example: 'ADMIN' },
      person: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string', example: 'uuid-5678' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          email: {
            type: 'string',
            example: 'john.doe@example.com',
            nullable: true,
          },
          phone: { type: 'string', example: '+1234567890', nullable: true },
        },
      },
    },
  })
  user?: {
    id: string;
    userName: string;
    email: string;
    rol: string;
    person?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    } | null;
  };

  @ApiPropertyOptional({
    description: 'Error message (only present on failed login)',
    example: 'Invalid credentials',
  })
  message?: string;
}
