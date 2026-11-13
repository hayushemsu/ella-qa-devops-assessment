"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("./entities/product.entity");
const constants_1 = require("../constants");
let ProductsService = class ProductsService {
    productRepository;
    constructor(productRepository) {
        this.productRepository = productRepository;
    }
    async create(dto) {
        try {
            const product = this.productRepository.create({
                ...dto,
                status: dto.status || constants_1.ProductStatus.FOR_SALE,
            });
            const savedProduct = await this.productRepository.save(product);
            return {
                statusCode: common_1.HttpStatus.CREATED,
                message: 'Product created successfully',
                data: savedProduct,
            };
        }
        catch (error) {
            if (error instanceof typeorm_2.QueryFailedError &&
                error.code === '23505') {
                throw new common_1.ConflictException('Product name already exists');
            }
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error creating product',
                error: error.message,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findAll() {
        try {
            const products = await this.productRepository.find({
                relations: ['transactions'],
            });
            return {
                statusCode: common_1.HttpStatus.OK,
                message: 'Products retrieved successfully',
                data: products,
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error retrieving products',
                error: error.message,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findOne(id) {
        try {
            const product = await this.productRepository.findOne({
                where: { id },
                relations: ['transactions'],
            });
            if (!product) {
                throw new common_1.NotFoundException(`Product with ID ${id} not found`);
            }
            return {
                statusCode: common_1.HttpStatus.OK,
                message: 'Product retrieved successfully',
                data: product,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error retrieving product',
                error: error.message,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async update(id, dto) {
        const product = await this.productRepository.findOne({ where: { id } });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        try {
            product.name = dto.name ?? product.name;
            product.price = dto.quantity ?? product.price;
            product.quantity = dto.quantity ?? product.quantity;
            product.status = dto.status ?? product.status;
            const updatedProduct = await this.productRepository.save(product);
            return {
                statusCode: common_1.HttpStatus.OK,
                message: 'Product updated successfully',
                data: updatedProduct,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            if (error instanceof typeorm_2.QueryFailedError &&
                error.code === '23505') {
                throw new common_1.ConflictException('Product name already exists');
            }
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error updating product',
                error: error.message,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ProductsService);
//# sourceMappingURL=products.service.js.map