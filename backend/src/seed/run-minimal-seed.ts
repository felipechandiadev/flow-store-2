#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { MinimalSeedModule } from './minimal-seed.module';
import { User, UserRole } from '@modules/users/domain/user.entity';
import {
  Person,
  PersonType,
  DocumentType,
} from '@modules/persons/domain/person.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MinimalSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);

    const userRepo = dataSource.getRepository(User);
    const personRepo = dataSource.getRepository(Person);

    const userName = process.env.SEED_ADMIN_USERNAME || 'admin';
    const password = process.env.SEED_ADMIN_PASSWORD || '098098';
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@flowstore.local';

    let user = await userRepo.findOne({
      where: { userName, deletedAt: null as never },
      relations: ['person'],
    });

    if (!user) {
      const person = personRepo.create({
        type: PersonType.NATURAL,
        firstName: 'Administrador',
        lastName: 'Sistema',
        documentType: DocumentType.RUT,
        documentNumber: '11111111-1',
        email,
      });
      const savedPerson = await personRepo.save(person);

      user = userRepo.create({
        userName,
        pass: await bcrypt.hash(password, 12),
        mail: email,
        rol: UserRole.ADMIN,
        person: savedPerson,
      });
      await userRepo.save(user);

      console.log(
        `✅ Seed mínimo OK. Usuario creado: userName='${userName}' password='${password}'`,
      );
      return;
    }

    // If user exists, ensure it's loginable (password hashed, email/role set)
    const needsBcrypt = !user.pass?.startsWith('$2');
    if (needsBcrypt) {
      user.pass = await bcrypt.hash(password, 12);
    }
    user.mail = email;
    user.rol = UserRole.ADMIN;

    if (!user.person) {
      const person = personRepo.create({
        type: PersonType.NATURAL,
        firstName: 'Administrador',
        lastName: 'Sistema',
        documentType: DocumentType.RUT,
        documentNumber: '11111111-1',
        email,
      });
      user.person = await personRepo.save(person);
    } else if (!user.person.email) {
      user.person.email = email;
      await personRepo.save(user.person);
    }

    await userRepo.save(user);

    console.log(
      `✅ Seed mínimo OK. Usuario actualizado: userName='${userName}' password='${password}'`,
    );
  } catch (error) {
    console.error('❌ Error ejecutando seed mínimo:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();

