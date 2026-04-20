import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Username for authentication',
    example: 'admin',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
  userName: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 4,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres' })
  password: string;
}
