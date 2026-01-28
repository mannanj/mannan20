import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';

const MIN_AMOUNT = 1;

@Component({
  selector: 'payment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-[#0b0b0b] flex items-center justify-center px-4">
      <div class="w-full max-w-[380px] text-center">
        <img
          src="mannan.jpg"
          alt="Mannan Javid"
          class="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
        />
        <h1 class="text-white text-2xl font-semibold mb-1 font-[Lucida_Grande]">Mannan Javid</h1>
        <p class="text-gray-400 text-sm mb-8 font-[Lucida_Grande]">Make a Payment to Mannan</p>

        @if (status() === 'success') {
          <div class="bg-green-900/30 border border-green-700 rounded-lg p-6 mb-6">
            <div class="text-green-400 text-lg font-medium mb-1">Payment Successful</div>
            <p class="text-green-300/70 text-sm">Thank you for your payment.</p>
          </div>
          <a href="/payment" class="text-[#039be5] hover:underline text-sm">Make another payment</a>
        } @else if (status() === 'cancel') {
          <div class="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6 mb-6">
            <div class="text-yellow-400 text-lg font-medium mb-1">Payment Cancelled</div>
            <p class="text-yellow-300/70 text-sm">Your payment was not processed.</p>
          </div>
          <a href="/payment" class="text-[#039be5] hover:underline text-sm">Try again</a>
        } @else {
          <div class="mb-6">
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
              <input
                type="number"
                [(ngModel)]="amount"
                [min]="minAmount"
                step="0.01"
                placeholder="0.00"
                class="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg py-3 pl-9 pr-4 text-white text-lg focus:outline-none focus:border-[#039be5] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <button
            (click)="pay()"
            [disabled]="!canPay()"
            class="w-full bg-[#039be5] hover:bg-[#0288d1] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors text-lg"
          >
            @if (loading()) {
              Processing...
            } @else {
              Pay
            }
          </button>

          @if (error()) {
            <p class="text-red-400 text-sm mt-4">{{ error() }}</p>
          }
        }
      </div>
    </div>
  `
})
export class Payment implements OnInit {
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentService);

  protected readonly minAmount = MIN_AMOUNT;

  amount = signal<number | null>(null);
  loading = signal(false);
  error = signal('');
  status = signal<'idle' | 'success' | 'cancel'>('idle');

  canPay = computed(() => {
    const amt = this.amount();
    return amt !== null && amt >= MIN_AMOUNT && !this.loading();
  });

  ngOnInit() {
    const s = this.route.snapshot.queryParamMap.get('status');
    if (s === 'success' || s === 'cancel') {
      this.status.set(s);
    }
  }

  pay() {
    const amt = this.amount();
    if (amt === null || amt < MIN_AMOUNT) return;

    this.loading.set(true);
    this.error.set('');

    this.paymentService.createCheckoutSession(amt).subscribe({
      next: (res) => {
        window.location.href = res.url;
      },
      error: () => {
        this.error.set('Something went wrong. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
