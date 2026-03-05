import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Products / Catálogo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    @ApiOperation({ summary: 'Registrar un nuevo producto/presentación en el catálogo' })
    @ApiResponse({ status: 201, description: 'Producto creado' })
    create(@Request() req, @Body() createProductDto: CreateProductDto) {
        return this.productsService.create(req.user.organizationId, createProductDto);
    }

    @Get('catalog')
    @ApiOperation({ summary: 'Catalogo para pacientes', description: 'Productos disponibles con info de cepa, precio y presentacion. Sin datos internos de stock/lotes.' })
    @ApiResponse({ status: 200, description: 'Catalogo retornado' })
    findCatalog(@Request() req) {
        return this.productsService.findCatalog(req.user.organizationId);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todo el catálogo de productos con su stock' })
    @ApiResponse({ status: 200, description: 'Catálogo retornado' })
    findAll(@Request() req) {
        return this.productsService.findAll(req.user.organizationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Ver detalles de un producto específico' })
    @ApiResponse({ status: 200, description: 'Detalles del producto' })
    findOne(@Request() req, @Param('id') id: string) {
        return this.productsService.findOne(req.user.organizationId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar un producto (precio, stock, etc)' })
    @ApiResponse({ status: 200, description: 'Producto actualizado' })
    update(@Request() req, @Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
        return this.productsService.update(req.user.organizationId, id, updateProductDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar producto del catálogo (Soft delete)' })
    @ApiResponse({ status: 200, description: 'Producto eliminado' })
    remove(@Request() req, @Param('id') id: string) {
        return this.productsService.remove(req.user.organizationId, id);
    }
}
