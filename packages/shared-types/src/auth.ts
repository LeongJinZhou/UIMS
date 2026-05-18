import { UserRole } from './enums';

/** JWT payload structure */
export interface JwtPayload {
  sub: string;        // User ID
  email: string;
  role: UserRole;
  facultyId?: string;
  programmeId?: string;
  iat?: number;
  exp?: number;
}

/** Login request */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Login response */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

/** User profile (safe to expose to client) */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  facultyId?: string;
  programmeId?: string;
  avatarUrl?: string;
  createdAt: string;
}
