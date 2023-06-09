import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'sequelize-typescript';
import { CheckUserDto } from './dto/check-user.dto';
import { User } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User) private userRepository: Repository<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  // check user email and password and get token
  async checkAuthUser(checkUser: CheckUserDto) {
    const { email, password } = checkUser;

    const user = await this.getUserEmail(email);

    if (!user) {
      return null;
    }

    const isMatch = await this.checkHashPassword(password, user);

    if (!isMatch) {
      return null;
    }

    const token = await this.generateToken(user);

    return token;
  }

  async createUser(email: string, password: string) {
    const hashPassword = await this.hashPassword(password);

    const user = await this.userRepository.create({
      email,
      password: hashPassword,
    });

    return user;
  }

  async getAllUsers() {
    const users = await this.userRepository.findAll({
      include: { all: true },
    });

    return users;
  }

  async getOneUser(user_id: number) {
    const user = await this.userRepository.findOne({
      where: { user_id },
      include: { all: true },
    });

    return user;
  }

  async getUserEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      include: { all: true },
    });

    return user;
  }

  async updateUser(email: string, password: string, id: number) {
    const hashPassword = await this.hashPassword(password);

    const checkUpdate = await this.userRepository.update(
      { email, password: hashPassword },
      { where: { user_id: id } },
    );

    return checkUpdate;
  }

  async removeUser(id: number) {
    await this.userRepository.destroy({
      where: {
        user_id: id,
      },
      force: true,
    });
  }

  // generation token
  private async generateToken(user: User) {
    const { user_id, email } = user;

    const payload = { user_id, email };

    const token = this.jwtService.sign(payload);

    return token;
  }

  private async hashPassword(password: string) {
    const saltRounds = this.configService.get<string>('SALT_ROUNDS');

    const salt = await bcrypt.genSalt(parseInt(saltRounds));

    const hashPassword = await bcrypt.hash(password, salt);

    return hashPassword;
  }

  private async checkHashPassword(password: string, user: User) {
    return await bcrypt.compare(password, user.password);
  }
}
