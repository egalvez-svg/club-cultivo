import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleName } from '../../common/enums';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            return false;
        }

        // El SuperAdmin tiene acceso a todo por defecto
        if (user.role === RoleName.SUPER_ADMIN) {
            return true;
        }

        const hasRole = requiredRoles.some((role) => user.role === role);

        if (!hasRole) {
            throw new ForbiddenException('No tienes permisos suficientes para realizar esta acción');
        }

        return true;
    }
}
