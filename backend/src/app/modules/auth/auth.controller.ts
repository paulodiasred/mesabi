import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login (mock for now)' })
  async login(@Body() body: { email: string; password: string }) {
    // Mock login - returns success
    return {
      access_token: 'mock-jwt-token',
      user: {
        id: '1',
        email: body.email,
        name: 'Test User',
        role: 'admin',
      },
    };
  }
}

