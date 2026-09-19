import type { LeaderboardId, LeaderboardResponse, ScoreReport } from './leaderboardApi';

/**
 * 榜单 WebSocket 客户端（单例）
 * 与后端保持一条长连接，订阅榜单后由服务端推送更新，避免反复 HTTP 轮询。
 * 连接不可用时调用方回退到 HTTP 接口。
 */

type Listener = (data: LeaderboardResponse) => void;

interface ServerMessage {
  type?: string;
  payload?: LeaderboardResponse;
  message?: string;
}

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`;

class LeaderboardSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private pending: { resolve: (d: LeaderboardResponse) => void; reject: (e: Error) => void } | null =
    null;
  private retry = 0;
  private retryTimer: number | null = null;
  private current: { board: LeaderboardId; userId: string } | null = null;

  /** 是否已连接 */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private connect(): Promise<void> {
    if (this.connected) return Promise.resolve();

    return new Promise((resolve, reject) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        return reject(new Error('WebSocket 不可用'));
      }

      const timer = window.setTimeout(() => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        reject(new Error('WebSocket 连接超时'));
      }, 4000);

      ws.onopen = () => {
        window.clearTimeout(timer);
        this.ws = ws;
        this.retry = 0;
        ws.onmessage = (ev) => this.onMessage(ev);
        ws.onclose = () => this.onClose();
        ws.onerror = () => {
          /* 由 onclose 统一处理 */
        };
        resolve();
      };

      ws.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('WebSocket 连接失败'));
      };
    });
  }

  private onMessage(ev: MessageEvent): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(String(ev.data)) as ServerMessage;
    } catch {
      return;
    }

    if (msg.type === 'leaderboard' && msg.payload) {
      this.pending?.resolve(msg.payload);
      this.pending = null;
      this.listeners.forEach((fn) => fn(msg.payload as LeaderboardResponse));
    }
  }

  private onClose(): void {
    this.ws = null;
    this.pending?.reject(new Error('连接已断开'));
    this.pending = null;
    // 指数退避重连（最长 30s）
    if (this.retryTimer !== null) return;
    const delay = Math.min(30_000, 1000 * 2 ** this.retry);
    this.retry = Math.min(5, this.retry + 1);
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      if (!this.current) return;
      this.connect()
        .then(() => this.subscribeNow())
        .catch(() => {
          /* 静默失败，等待下次重连 */
        });
    }, delay);
  }

  private subscribeNow(): void {
    if (!this.ws || !this.current) return;
    this.ws.send(JSON.stringify({ type: 'subscribe', ...this.current }));
  }

  /** 订阅榜单：返回一次快照，并在数据变更时回调推送 */
  async subscribe(
    board: LeaderboardId,
    userId: string,
    onData?: Listener
  ): Promise<LeaderboardResponse> {
    this.current = { board, userId };
    if (onData) this.listeners.add(onData);

    await this.connect();
    this.subscribeNow();

    return new Promise<LeaderboardResponse>((resolve, reject) => {
      this.pending = { resolve, reject };
      window.setTimeout(() => {
        if (this.pending) {
          this.pending.reject(new Error('榜单响应超时'));
          this.pending = null;
        }
      }, 5000);
    });
  }

  /** 取消监听 */
  off(onData: Listener): void {
    this.listeners.delete(onData);
  }

  /** 关闭订阅 */
  unsubscribe(): void {
    this.listeners.clear();
    this.current = null;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe' }));
    }
  }

  /** 通过长连接上报成绩 */
  report(report: ScoreReport): boolean {
    if (!this.connected) return false;
    this.ws?.send(JSON.stringify({ type: 'score', payload: report }));
    return true;
  }
}

export const leaderboardSocket = new LeaderboardSocket();
