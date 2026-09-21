import 'reflect-metadata'; import {NestFactory} from '@nestjs/core'; import {AppModule} from './module';
async function main(){const app=await NestFactory.create(AppModule); app.enableCors(); await app.listen(Number(process.env.PORT||3000),'0.0.0.0');} main();
