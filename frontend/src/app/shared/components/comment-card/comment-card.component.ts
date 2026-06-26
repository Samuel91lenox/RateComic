import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { environment } from '../../../../environments/environment';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Comment } from '../../../core/models/comment.model';
import { AuthService } from '../../../core/services/auth.service';
import { TPipe } from '../../pipes/t.pipe';

@Component({
  selector: 'app-comment-card',
  standalone: true,
  imports: [
    CommonModule, DatePipe, ReactiveFormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, TPipe,
  ],
  template: `
    <div class="comment-card">
      <div class="comment-header">
        <a [routerLink]="['/user', comment.user_id]" class="avatar-link" [attr.aria-label]="comment.username">
          @if (comment.avatar_url) {
            <img [src]="resolveAvatar(comment.avatar_url)" [alt]="comment.username" class="avatar-img">
          } @else {
            <mat-icon class="avatar-icon">account_circle</mat-icon>
          }
        </a>
        <div class="comment-meta">
          <span class="username">{{ comment.username }}</span>
          <span class="date text-muted">{{ comment.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
        </div>
        @if (canDeleteComment()) {
          <button mat-icon-button color="warn" (click)="onDelete()" [attr.aria-label]="'comments.delete' | t">
            <mat-icon>delete_outline</mat-icon>
          </button>
        }
      </div>

      <p class="comment-content">{{ comment.content }}</p>

      @if (!isReply) {
        <button mat-button color="accent" (click)="showReply = !showReply">
          <mat-icon>reply</mat-icon>
          {{ 'comments.reply' | t }}
        </button>

        @if (showReply) {
          <div class="reply-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'comments.yourReply' | t }}</mat-label>
              <textarea matInput [formControl]="replyControl" rows="2" maxlength="2000"></textarea>
            </mat-form-field>
            <div class="reply-actions">
              <button mat-button (click)="showReply = false">{{ 'comments.cancel' | t }}</button>
              <button mat-raised-button color="primary"
                [disabled]="replyControl.invalid"
                (click)="submitReply()">
                {{ 'comments.publish' | t }}
              </button>
            </div>
          </div>
        }

        @if (comment.replies?.length) {
          <div class="replies">
            @for (reply of comment.replies; track reply.id) {
              <app-comment-card
                [comment]="reply"
                [isReply]="true"
                (deleted)="onReplyDeleted(reply.id)"
              />
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .comment-card {
      padding: 12px 0;
      border-bottom: 1px solid var(--rf-border);
    }
    .comment-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
    }
    .avatar-icon { color: var(--rf-text-muted); font-size: 36px; width: 36px; height: 36px; }
    .avatar-img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    .avatar-link { display: flex; color: inherit; border-radius: 50%; transition: opacity 0.2s; &:hover { opacity: 0.7; } }
    .comment-meta { display: flex; flex-direction: column; flex: 1; }
    .username { font-weight: 500; }
    .date { font-size: 0.78rem; }
    .comment-content { margin: 4px 0 8px; line-height: 1.5; }
    .reply-form { margin-top: 8px; }
    .full-width { width: 100%; }
    .reply-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
    .replies { margin-left: 32px; border-left: 2px solid var(--rf-border); padding-left: 12px; }
  `],
})
export class CommentCardComponent {
  @Input({ required: true }) comment!: Comment;
  @Input() isReply = false;
  @Output() deleted = new EventEmitter<number>();
  @Output() replied = new EventEmitter<{ parent_id: number; content: string }>();

  readonly auth = inject(AuthService);

    resolveAvatar(url: string): string {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return `${environment.apiUrl.replace('/api', '')}${url}`;
    }
  showReply = false;
  replyControl = new FormControl('', [Validators.required, Validators.minLength(1)]);

  onDelete() {
    this.deleted.emit(this.comment.id);
  }

  canDeleteComment(): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;
    return user.id === this.comment.user_id || user.role === 'admin';
  }

  onReplyDeleted(id: number) {
    if (this.comment.replies) {
      this.comment.replies = this.comment.replies.filter(r => r.id !== id);
    }
  }

  submitReply() {
    if (this.replyControl.invalid) return;
    this.replied.emit({ parent_id: this.comment.id, content: this.replyControl.value! });
    this.replyControl.reset();
    this.showReply = false;
  }
}
