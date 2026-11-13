import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ApiResponse } from 'src/constants';
export declare class TransactionsController {
    private readonly transactionsService;
    constructor(transactionsService: TransactionsService);
    create(dto: CreateTransactionDto): Promise<ApiResponse<Transaction>>;
    findAll(): Promise<ApiResponse<Transaction[]>>;
    findOne(id: string): Promise<ApiResponse<Transaction>>;
}
