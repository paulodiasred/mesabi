import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Simple JWT guard for now - allows all requests
 * TODO: Implement proper JWT validation
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // For now, allow all requests
    // In production, validate JWT token here
    return true;
  }
}

