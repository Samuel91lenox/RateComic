import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CommentCardComponent } from './comment-card.component';
import { AuthService } from '../../../core/services/auth.service';

describe('CommentCardComponent', () => {
  let fixture: ComponentFixture<CommentCardComponent>;
  let component: CommentCardComponent;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommentCardComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentCardComponent);
    component = fixture.componentInstance;
    auth = TestBed.inject(AuthService);

    component.comment = {
      id: 10,
      user_id: 2,
      media_id: 1,
      content: 'Test',
      username: 'author',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  it('permite borrar cuando el usuario es el autor', () => {
    auth.currentUser.set({
      id: 2,
      username: 'author',
      email: 'author@example.com',
      role: 'user',
      created_at: new Date().toISOString(),
    });

    expect(component.canDeleteComment()).toBe(true);
  });

  it('permite borrar cuando el usuario es admin', () => {
    auth.currentUser.set({
      id: 99,
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      created_at: new Date().toISOString(),
    });

    expect(component.canDeleteComment()).toBe(true);
  });

  it('no permite borrar cuando no es autor ni admin', () => {
    auth.currentUser.set({
      id: 8,
      username: 'other',
      email: 'other@example.com',
      role: 'user',
      created_at: new Date().toISOString(),
    });

    expect(component.canDeleteComment()).toBe(false);
  });
});
