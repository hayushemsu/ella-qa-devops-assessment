import { ProductStatus } from 'src/constants';
export declare class CreateProductDto {
    name: string;
    price: number;
    quantity: number;
    status?: ProductStatus;
}
