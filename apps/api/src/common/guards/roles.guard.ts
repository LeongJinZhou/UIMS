import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RBAC Guard — checks if the user has the required role for the route.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required — public route
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // ADMIN has access to everything
    if (user.role === 'ADMIN') return true;

    return requiredRoles.includes(user.role);
  }
}
