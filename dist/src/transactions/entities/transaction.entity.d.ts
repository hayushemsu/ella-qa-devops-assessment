import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
export declare class Transaction {
    id: number;
    user: User;
    product: Product;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
}
