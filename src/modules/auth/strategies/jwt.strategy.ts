import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

type JwtPayload = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      ignoreExpiration: false,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('jwt.secret') ?? '',
    });
  }

  // AR: يحول حمولة الرمز الموثقة إلى هوية طلب صغيرة.
  // EN: Converts the verified token payload into minimal request identity.
  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      role: payload.role,
    };
  }
}
