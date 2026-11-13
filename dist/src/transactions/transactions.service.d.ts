import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { ApiResponse } from 'src/constants';
export declare class TransactionsService {
    private readonly transactionRepository;
    private readonly userRepository;
    private readonly productRepository;
    constructor(transactionRepository: Repository<Transaction>, userRepository: Repository<User>, productRepository: Repository<Product>);
    create(dto: CreateTransactionDto): Promise<ApiResponse<Transaction>>;
    findAll(): Promise<ApiResponse<Transaction[]>>;
    findOne(id: number): Promise<ApiResponse<Transaction>>;
}
