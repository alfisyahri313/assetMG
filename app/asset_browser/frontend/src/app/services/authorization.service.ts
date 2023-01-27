/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {

  authInstance = null;
  refreshToken = null;
  loggedIn$: Observable<boolean>;
  private loggedInSubject: BehaviorSubject<boolean>;

  constructor(private _configService: ConfigService) {
    this.retrieveStoredRefreshToken().then((token) => {
      if (token) {
        this.refreshToken = token;
        this.loggedInSubject = new BehaviorSubject<boolean>(true);
      } else {
        this.loggedInSubject = new BehaviorSubject<boolean>(false);
      }
      this.loggedIn$ = this.loggedInSubject.asObservable();
    });
  }


  async authenticate(force=false) {
    var error = "";
    var storedToken = await this.retrieveStoredRefreshToken();
    var config = this._configService.getConfigSettings();
    var refreshAccessToken;
    if (!force && storedToken) {
      this.refreshToken = storedToken;
      this.loggedInSubject.next(true);
    } else {

      // Initialize google identiy service 
      await google.accounts.oauth2
        .initCodeClient({
          client_id: config.client_id,
          scope: "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/youtube.readonly 'https://www.googleapis.com/auth/userinfo.profile' 'https://www.googleapis.com/auth/userinfo.email'",
          ux_mode: 'popup',
          callback: (res) => {
            refreshAccessToken = res.code
            this._configService
                .getConfigRefreshCode(refreshAccessToken)
                .toPromise()
                .then((response) => {
                  this.refreshToken = response.body;
                  this.loggedInSubject.next(true);
                  this.storeRefreshToken(this.refreshToken);
                })
                .catch((err) => {
                  error = err["error"];
                });
          },
        })
        .requestCode();

      // Quick exit
      if (error) throw new Error(error);
    }

    if (error) {
      throw new Error(error);
    }
  }

  private async storeRefreshToken(token: string) {
    window.localStorage.setItem('refreshToken', token);
  }

  private async retrieveStoredRefreshToken() {
    return window.localStorage.getItem('refreshToken');
  }

  private async removeStoredRefreshToken() {
    window.localStorage.removeItem('refreshToken');
  }

  public getRefreshToken() {
    if (!this.refreshToken) {
      throw new Error("No refresh token found. Please login.");
    }
    return this.refreshToken;
  }

  public async login() {
    await this.authenticate();
  }

  public async logout() {
    this.refreshToken = null;
    this.loggedInSubject.next(false);
    await this.removeStoredRefreshToken();
  }

  public loginOrOut() {
    if (this.loggedInSubject.value) {
      this.logout()
    } else {
      this.login();
    }
  }
}
