import { Transaction } from '../../transactions/entities/transaction.entity';
declare enum ProductStatus {
    FOR_SALE = "FOR_SALE",
    OUT_OF_STOCK = "OUT_OF_STOCK"
}
export declare class Product {
    id: number;
    name: string;
    price: number;
    quantity: number;
    status: ProductStatus;
    transactions: Transaction[];
    createdAt: Date;
    updatedAt: Date;
}
export {};
