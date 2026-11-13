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
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const transaction_entity_1 = require("./entities/transaction.entity");
const user_entity_1 = require("../users/entities/user.entity");
const product_entity_1 = require("../products/entities/product.entity");
const constants_1 = require("../constants");
let TransactionsService = class TransactionsService {
    transactionRepository;
    userRepository;
    productRepository;
    constructor(transactionRepository, userRepository, productRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
    }
    async create(dto) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: dto.userId },
            });
            if (!user)
                throw new common_1.NotFoundException(`User with ID ${dto.userId} not found`);
            const product = await this.productRepository.findOne({
                where: { id: dto.productId },
            });
            if (!product)
                throw new common_1.NotFoundException(`Product with ID ${dto.productId} not found`);
            if (dto.quantity > product.quantity) {
                throw new common_1.ConflictException(`Requested quantity (${dto.quantity}) exceeds available stock (${product.quantity})`);
            }
            const transaction = this.transactionRepository.create({
                user,
                product,
                quantity: dto.quantity,
            });
            const savedTransaction = await this.transactionRepository.save(transaction);
            product.quantity += dto.quantity;
            if (product.quantity === 0) {
                product.status = constants_1.ProductStatus.OUT_OF_STOCK;
            }
            await this.productRepository.save(product);
            return {
                statusCode: common_1.HttpStatus.CREATED,
                message: 'Transaction created successfully',
                data: savedTransaction,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.ConflictException)
                throw error;
            if (error instanceof typeorm_2.QueryFailedError) {
                throw new common_1.ConflictException('Database error: ' + error.message);
            }
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error creating transaction',
                error: error.message,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findAll() {
        try {
            const transactions = await this.transactionRepository.find({
                relations: ['user', 'product'],
            });
            return {
                statusCode: common_1.HttpStatus.OK,
                message: 'Transactions retrieved successfully',
                data: transactions,
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error retrieving transactions',
                error: error.message,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findOne(id) {
        try {
            const transaction = await this.transactionRepository.findOne({
                where: { id },
                relations: ['user', 'product'],
            });
            if (!transaction)
                throw new common_1.NotFoundException(`Transaction with ID ${id} not found`);
            return {
                statusCode: common_1.HttpStatus.OK,
                message: 'Transaction retrieved successfully',
                data: transaction,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error retrieving transaction',
                error: error.message,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map