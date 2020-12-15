import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

const BASE_URL = environment.apiUrl + '/auth';


export interface LoginResponseData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  activeStatus?: boolean;
}

export class User {
  constructor(
    public userId: string,
    public accessToken: string,
    public refreshToken: string,
    public accessTokenExpiry: string,
    public refreshTokenExpiry: string
  ) { }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private isAuth = new Subject<boolean>();
  private user: User;
  private tokenExpirationTimer: any;

  constructor(private http: HttpClient, private router: Router) { }
  signup(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    phoneNumber: string
  ) {
    return this.http
      .post(BASE_URL + '/signup', {
        firstName,
        lastName,
        email,
        password,
        phoneNumber,
      });
  }

  login(email: string, password: string, remember: boolean) {
    return this.http
      .post<LoginResponseData>(BASE_URL + '/login', {
        email,
        password,
      })
      .pipe(
        tap((resData) => {
          this.handleAuthentication(
            remember,
            resData.userId,
            resData.accessToken,
            resData.refreshToken,
            resData.accessTokenExpiry,
            resData.refreshTokenExpiry,
            resData.activeStatus
          );
        })
      );
  }

  getNewToken() {
    if (!this.user) {
      return this.logout();
    }
    return this.http
      .post<{ token: string; userId: string; expiresIn: string; }>(
        BASE_URL + '/refreshToken',
        {
          accessToken: this.user.accessToken,
          refreshToken: this.user.refreshToken,
        }
      )
      .pipe(
        tap((resData) => {
          if (!this.user) {
            return this.logout();
          }
          this.user.accessToken = resData.token;
        })
      );
  }

  autoLogin() {
    const loadedData = localStorage.getItem('userData');
    if (!loadedData) {
      return;
    }
    const loadedUser: User = JSON.parse(loadedData);
    if (!loadedUser) {
      return;
    }
    const expiryDuration = new Date(loadedUser.refreshTokenExpiry).getTime() - new Date().getTime();
    if (expiryDuration > 0) {
      this.user = loadedUser;
      this.isAuth.next(true);
      this.autoLogout(expiryDuration);
    }
  }

  logout() {
    this.user = null;
    this.isAuth.next(false);
    this.router.navigate(['/auth/login']);
    localStorage.removeItem('userData');
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    this.tokenExpirationTimer = null;
  }

  autoLogout(expirationDuration: number) {
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expirationDuration);
  }

  getAuthObs() {
    return this.isAuth.asObservable();
  }

  getIsAuth() {
    return this.user !== null;
  }

  getAccessToken() {
    return this.user !== null ? this.user.accessToken : null;
  }

  private handleAuthentication(
    remember: boolean,
    userId: string,
    accessToken: string,
    refreshToken: string,
    accessTokenExpiry: string,
    refreshTokenExpiry: string,
    activeStatus?: boolean
  ) {
    const accessTokenExpirationDate = new Date(accessTokenExpiry);
    const refreshTokenExpirationDate = new Date(refreshTokenExpiry);
    const user = new User(
      userId,
      accessToken,
      refreshToken,
      accessTokenExpirationDate.toISOString(),
      refreshTokenExpirationDate.toISOString()
    );
    this.user = user;
    this.isAuth.next(true);
    this.autoLogout(+refreshTokenExpiry);
    if (remember) {
      localStorage.setItem('userData', JSON.stringify(user));
    }
  }
}