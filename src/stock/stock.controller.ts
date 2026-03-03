import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Stock (Ledger)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
    constructor(private readonly stockService: StockService) { }

    @Get('ledger')
    @ApiOperation({ summary: 'Consultar Ledger Global', description: 'Retorna el balance consolidado de stock por producto y lote' })
    getGlobalLedger(@Request() req) {
        return this.stockService.getGlobalLedger(req.user.organizationId);
    }

    @Get('lots/:id/history')
    @ApiOperation({ summary: 'Historial de Lote', description: 'Retorna todos los movimientos de stock asociados a un lote específico' })
    getLotHistory(@Request() req, @Param('id') id: string) {
        return this.stockService.getLotHistory(id);
    }
}
