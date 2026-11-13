import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiResponse } from 'src/constants';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(dto: CreateUserDto): Promise<ApiResponse<User>>;
    findAll(): Promise<ApiResponse<User[]>>;
    findOne(id: string): Promise<ApiResponse<User>>;
    update(id: string, dto: CreateUserDto): Promise<ApiResponse<User>>;
}
