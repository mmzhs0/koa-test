import { Context } from 'koa';
import { pool } from '../helpers/pool';
import HashService from '../helpers/HashService';
import JwtService from './JwtService';
import { response } from '../helpers/response';

export interface IUserData {
    password: string;
    email: string;
}

export class AuthService {
    static async findOneByEmail(email: string) {
        return await pool.query('SELECT * FROM users WHERE username = $1', [
            email,
        ]);
    }

    async signup(ctx: Context) {
        const { password, email } = ctx.request.body as IUserData;

        const user = (await AuthService.findOneByEmail(email)).rows[0];

        if (user) {
            ctx.status = 401;
            ctx.body = { message: 'User with given email already exists.' };
            return;
        }

        const hash = await HashService.hashPassword(password);
        const token = JwtService.createToken(email);

        await pool.query(
            'INSERT INTO users(username, password) VALUES($1, $2)',
            [email, hash],
        );

        response(ctx, 201, token);
    }

    async login(ctx: Context) {
        const { password, email } = ctx.request.body as IUserData;

        const user = (await AuthService.findOneByEmail(email)).rows[0];

        if (!user) {
            ctx.status = 401;
            ctx.body = { message: 'Wrong credentials' };
            return;
        }

        if (!(await HashService.verifyPassword(user.password, password))) {
            ctx.status = 401;
            ctx.body = { message: 'Wrong credentials' };
            return;
        }
        response(ctx, 200, JwtService.createToken(email));
    }
}
