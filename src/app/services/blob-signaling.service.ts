import { Injectable, inject, DestroyRef } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, interval, EMPTY, throwError } from 'rxjs';
import { switchMap, catchError, retry, tap, filter, takeUntil } from 'rxjs/operators';

interface Peer {
  id: string;
  lastSeen: number;
}

interface Signal {
  from: string;
  to: string;
  signal: any;
  timestamp: number;
}

interface PeersResponse {
  peers: Peer[];
}

interface SignalsResponse {
  signals: Signal[];
}

@Injectable({
  providedIn: 'root'
})
export class BlobSignalingService {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  private readonly API_BASE = '/api';
  private readonly POLL_INTERVAL_MS = 500;
  private readonly HEARTBEAT_INTERVAL_MS = 5000;

  private peerId: string | null = null;
  private polling = false;
  private heartbeatIntervalId: any;

  private signalSubject = new Subject<Signal>();
  private errorSubject = new Subject<Error>();
  private peersSubject = new Subject<Peer[]>();
  private destroy$ = new Subject<void>();

  signals$ = this.signalSubject.asObservable();
  errors$ = this.errorSubject.asObservable();
  peers$ = this.peersSubject.asObservable();

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanup());
  }

  join(peerId: string): Observable<void> {
    this.peerId = peerId;

    return this.http.post<{ message: string }>(`${this.API_BASE}/peers`, { peerId }).pipe(
      tap(() => {
        this.startHeartbeat();
        this.startPolling();
      }),
      switchMap(() => EMPTY),
      catchError(error => this.handleError('Failed to join peer network', error))
    );
  }

  leave(): Observable<void> {
    if (!this.peerId) {
      return EMPTY;
    }

    const peerId = this.peerId;
    this.cleanup();

    return this.http.post<{ message: string }>(`${this.API_BASE}/peers`, {
      peerId,
      action: 'leave'
    }).pipe(
      switchMap(() => EMPTY),
      catchError(error => this.handleError('Failed to leave peer network', error))
    );
  }

  getPeers(): Observable<Peer[]> {
    return this.http.get<PeersResponse>(`${this.API_BASE}/peers`).pipe(
      tap(response => this.peersSubject.next(response.peers)),
      switchMap(response => [response.peers]),
      catchError(error => this.handleError('Failed to get peers', error))
    );
  }

  sendOffer(to: string, offer: RTCSessionDescriptionInit): Observable<void> {
    return this.sendSignal(to, { type: 'offer', offer });
  }

  sendAnswer(to: string, answer: RTCSessionDescriptionInit): Observable<void> {
    return this.sendSignal(to, { type: 'answer', answer });
  }

  sendIceCandidate(to: string, candidate: RTCIceCandidate): Observable<void> {
    return this.sendSignal(to, { type: 'candidate', candidate });
  }

  private sendSignal(to: string, signal: any): Observable<void> {
    if (!this.peerId) {
      return throwError(() => new Error('Not connected to peer network'));
    }

    return this.http.post<{ message: string }>(`${this.API_BASE}/signals`, {
      from: this.peerId,
      to,
      signal
    }).pipe(
      switchMap(() => EMPTY),
      retry({
        count: 3,
        delay: 1000
      }),
      catchError(error => this.handleError('Failed to send signal', error))
    );
  }

  private startPolling(): void {
    if (this.polling || !this.peerId) {
      return;
    }

    this.polling = true;

    interval(this.POLL_INTERVAL_MS).pipe(
      takeUntil(this.destroy$),
      filter(() => this.polling && this.peerId !== null),
      switchMap(() => this.pollSignals())
    ).subscribe();
  }

  private pollSignals(): Observable<void> {
    if (!this.peerId) {
      return EMPTY;
    }

    return this.http.get<SignalsResponse>(`${this.API_BASE}/signals`, {
      params: { peerId: this.peerId }
    }).pipe(
      tap(response => {
        response.signals.forEach(signal => this.signalSubject.next(signal));
      }),
      switchMap(() => EMPTY),
      catchError(error => {
        this.handleError('Failed to poll signals', error);
        return EMPTY;
      })
    );
  }

  private startHeartbeat(): void {
    if (this.heartbeatIntervalId || !this.peerId) {
      return;
    }

    const peerId = this.peerId;

    this.heartbeatIntervalId = setInterval(() => {
      if (!this.peerId) {
        return;
      }

      this.http.post(`${this.API_BASE}/peers`, { peerId }).pipe(
        catchError(error => {
          this.handleError('Heartbeat failed', error);
          return EMPTY;
        })
      ).subscribe();
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  private cleanup(): void {
    this.polling = false;
    this.peerId = null;

    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }

    this.destroy$.next();
  }

  private handleError(message: string, error: unknown): Observable<never> {
    const err = error instanceof HttpErrorResponse
      ? new Error(`${message}: ${error.status} ${error.statusText}`)
      : new Error(`${message}: ${error}`);

    this.errorSubject.next(err);
    return throwError(() => err);
  }
}
