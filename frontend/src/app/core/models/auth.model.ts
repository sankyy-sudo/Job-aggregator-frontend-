export interface User {
  id: string;
  name: string;
  email: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload extends LoginPayload {
  name: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface SessionState {
  token: string;
  user: User;
}
