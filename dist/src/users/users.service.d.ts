import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiResponse } from 'src/constants';
export declare class UsersService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    create(dto: CreateUserDto): Promise<ApiResponse<User>>;
    findAll(): Promise<ApiResponse<User[]>>;
    findOne(id: number): Promise<ApiResponse<User>>;
    update(id: number, dto: CreateUserDto): Promise<ApiResponse<User>>;
}
