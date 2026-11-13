import { Transaction } from '../../transactions/entities/transaction.entity';
export declare class User {
    id: number;
    name: string;
    email: string;
    transactions: Transaction[];
    createdAt: Date;
    updatedAt: Date;
}
