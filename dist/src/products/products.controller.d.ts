import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ApiResponse } from 'src/constants';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(body: CreateProductDto): Promise<ApiResponse<Product>>;
    findAll(): Promise<ApiResponse<Product[]>>;
    findOne(id: string): Promise<ApiResponse<Product>>;
    update(id: string, body: CreateProductDto): Promise<ApiResponse<Product>>;
}
