import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  isAuth: boolean;
  authSub: Subscription;
  constructor(private authService: AuthService) { }
  ngOnInit() {
    this.isAuth = this.authService.getIsAuth();
    this.authSub = this.authService.getAuthObs().subscribe((isAUth) => {
      this.isAuth = isAUth;
    });
    if (!this.isAuth) {
      this.authService.autoLogin();
    }
  }
  ngOnDestroy() {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }
  logout() {
    this.authService.logout();
  }
}
