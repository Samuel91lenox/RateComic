import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="star-rating" [class.readonly]="readonly" role="group" [attr.aria-label]="i18n.t('rating.ariaLabel', { value: value })">
      @for (star of stars; track star) {
        <button
          type="button"
          class="star-btn"
          [class.filled]="star <= hoverValue"
          [matTooltip]="star + '/10'"
          [disabled]="readonly"
          (mouseenter)="!readonly && (hoverValue = star)"
          (mouseleave)="!readonly && (hoverValue = value)"
          (click)="!readonly && onSelect(star)"
          [attr.aria-label]="i18n.t('rating.rate', { value: star })">
          <mat-icon>{{ star <= hoverValue ? 'star' : 'star_border' }}</mat-icon>
        </button>
      }
      @if (showValue && value) {
        <span class="rating-label">{{ value }}/10</span>
      }
    </div>
  `,
  styles: [`
    .star-rating {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .star-btn {
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      color: var(--rf-star-empty);
      transition: color 0.15s, transform 0.1s;
      line-height: 1;
      &:hover:not([disabled]) { transform: scale(1.2); }
      &.filled { color: var(--rf-star-filled); }
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }
    .readonly .star-btn { cursor: default; }
    .rating-label {
      margin-left: 8px;
      font-weight: 600;
      color: var(--rf-accent);
      font-size: 1rem;
    }
  `],
})
export class StarRatingComponent {
  readonly i18n = inject(I18nService);
  @Input() value = 0;
  @Input() readonly = false;
  @Input() showValue = false;
  @Output() rated = new EventEmitter<number>();

  stars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  hoverValue = 0;

  ngOnInit() {
    this.hoverValue = this.value;
  }

  ngOnChanges() {
    this.hoverValue = this.value;
  }

  onSelect(star: number) {
    this.value = star;
    this.hoverValue = star;
    this.rated.emit(star);
  }
}
