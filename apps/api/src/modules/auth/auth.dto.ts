export interface LoginRequestDto {
  readonly email: string;
  readonly password: string;
}

export interface LoginResponseDto {
  readonly token: string;
  readonly expiresAt: string;
  readonly user: UserDto;
}

export interface UserDto {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly UserRole[];
}

export type UserRole = 'admin' | 'ops' | 'support' | 'readonly';

export const USER_ROLES: readonly UserRole[] = ['admin', 'ops', 'support', 'readonly'];
