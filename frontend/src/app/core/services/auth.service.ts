import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import {
  AuthResponse,
  LoginPayload,
  SessionState,
  SignupPayload,
  User
} from '../models/auth.model';
import { StorageService } from './storage.service';

import { environment } from '../../../environments/environment';

const API_URL = `${environment.apiUrl}/auth`;
const SESSION_KEY = 'job-aggregator-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly session = signal<SessionState | null>(
    this.storage.get<SessionState>(SESSION_KEY)
  );

  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly token = computed<string>(() => this.session()?.token ?? '');

  login(payload: LoginPayload) {
    return this.http
      .post<AuthResponse>(`${API_URL}/login`, payload)
      .pipe(tap(response => this.persistSession(response)));
  }

  signup(payload: SignupPayload) {
    return this.http
      .post<AuthResponse>(`${API_URL}/signup`, payload)
      .pipe(tap(response => this.persistSession(response)));
  }

  logout(): void {
    this.session.set(null);
    this.storage.remove(SESSION_KEY);
  }

  private persistSession(response: AuthResponse): void {
    const sessionState: SessionState = {
      token: response.token,
      user: response.user
    };

    this.session.set(sessionState);
    this.storage.set(SESSION_KEY, sessionState);
  }
}
