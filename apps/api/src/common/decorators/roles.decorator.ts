import { SetMetadata } from '@nestjs/common';

/**
 * Roles decorator — attaches required roles to a route handler.
 * Used with RolesGuard for RBAC enforcement.
 *
 * @example
 * @Roles('HEAD_OF_PROGRAMME', 'ADMIN')
 * @Get('approve')
 * approve() {}
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
