import { Role } from '@prisma/client';
import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      role: Role;
      allowed: boolean;
    };
  }

  interface User {
    role: Role;
    allowed: boolean;
  }
}
