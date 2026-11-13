import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ApiResponse } from 'src/constants';
export declare class ProductsService {
    private readonly productRepository;
    constructor(productRepository: Repository<Product>);
    create(dto: CreateProductDto): Promise<ApiResponse<Product>>;
    findAll(): Promise<ApiResponse<Product[]>>;
    findOne(id: number): Promise<ApiResponse<Product>>;
    update(id: number, dto: CreateProductDto): Promise<ApiResponse<Product>>;
}
