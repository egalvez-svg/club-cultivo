import { Controller, Post, Body, UnauthorizedException, Get, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto, RefreshTokenDto } from './dto/auth.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @ApiOperation({ summary: 'Iniciar sesión', description: 'Valida credenciales y devuelve un token JWT' })
    @ApiResponse({ status: 201, description: 'Login exitoso' })
    @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
    async login(@Body() loginDto: LoginDto) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }
        return this.authService.login(user);
    }



    @Post('forgot-password')
    @ApiOperation({ summary: 'Solicitar recuperación de contraseña', description: 'Envía un correo con un token de recuperación' })
    @ApiResponse({ status: 201, description: 'Token generado' })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto.email);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Restablecer contraseña', description: 'Usa el token recibido para cambiar la contraseña' })
    @ApiResponse({ status: 201, description: 'Contraseña actualizada' })
    @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Renovar tokens', description: 'Usa el refresh token para obtener un nuevo access token' })
    @ApiResponse({ status: 201, description: 'Tokens renovados' })
    @ApiResponse({ status: 401, description: 'Refresh token inválido' })
    async refresh(@Body() refreshDto: RefreshTokenDto) {
        return this.authService.refreshTokens(refreshDto.id, refreshDto.refreshToken);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener perfil actual', description: 'Retorna los datos del usuario autenticado' })
    @ApiResponse({ status: 200, description: 'Datos del usuario' })
    async getProfile(@Request() req) {
        return req.user;
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cambiar contraseña', description: 'Permite al usuario autenticado cambiar su contraseña' })
    @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
    @ApiResponse({ status: 401, description: 'Contraseña actual incorrecta' })
    async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
        return this.authService.changePassword(req.user.id, changePasswordDto.currentPassword, changePasswordDto.newPassword);
    }
}
