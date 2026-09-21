import {Module} from '@nestjs/common'; import {PrismaService} from './prisma.service'; import {AuthController,AppController} from './controllers'; import {AuthGuard} from './auth';
@Module({controllers:[AuthController,AppController],providers:[PrismaService,AuthGuard]}) export class AppModule{}
