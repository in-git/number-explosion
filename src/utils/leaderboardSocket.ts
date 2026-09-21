import type { LeaderboardId, LeaderboardResponse } from './leaderboardApi';
import type { SealedEnvelope } from './crypto';

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
  /** pending 的超时定时器：响应到达或被替换时必须清掉 */
  private pendingTimer: number | null = null;
  /** 正在建立的连接：并发 subscribe 复用同一个 Promise，避免重复建连 */
  private connecting: Promise<void> | null = null;
  private retry = 0;
  private retryTimer: number | null = null;
  private current: { board: LeaderboardId; userId: string } | null = null;

  /** 清理 pending 及其超时器 */
  private clearPending(): void {
    this.pending = null;
    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
  }

  /** 是否已连接 */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private connect(): Promise<void> {
    if (this.connected) return Promise.resolve();
    // 已有连接在创建中：复用，避免并发调用各建一条连接、各起一个超时器
    if (this.connecting) return this.connecting;

    const p = new Promise<void>((resolve, reject) => {
      /** 连接已定局：释放并发标记，避免后续调用一直复用这个已结束的 Promise */
      const settle = (fn: () => void) => {
        if (this.connecting === p) this.connecting = null;
        fn();
      };

      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        settle(() => reject(new Error('WebSocket 不可用')));
        return;
      }

      const timer = window.setTimeout(() => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        settle(() => reject(new Error('WebSocket 连接超时')));
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
        settle(resolve);
      };

      ws.onerror = () => {
        window.clearTimeout(timer);
        settle(() => reject(new Error('WebSocket 连接失败')));
      };
    });

    this.connecting = p;
    // 兜底：无论成败都释放并发标记（含同步失败的情况）
    const release = () => {
      if (this.connecting === p) this.connecting = null;
    };
    p.then(release, release);
    return p;
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
      this.clearPending();
      this.listeners.forEach((fn) => fn(msg.payload as LeaderboardResponse));
    }
  }

  private onClose(): void {
    this.ws = null;
    this.pending?.reject(new Error('连接已断开'));
    this.clearPending();
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

    // 重新订阅前先清掉上一次的等待（含其超时器），避免定时器堆积
    this.clearPending();

    return new Promise<LeaderboardResponse>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.pendingTimer = window.setTimeout(() => {
        this.pending?.reject(new Error('榜单响应超时'));
        this.clearPending();
      }, 5000);
    });
  }

  /** 取消监听 */
  off(onData: Listener): void {
    this.listeners.delete(onData);
  }

  /** 关闭订阅：彻底停掉重连定时器与等待定时器，避免页面后台仍在无限重连 */
  unsubscribe(): void {
    this.listeners.clear();
    this.current = null;
    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retry = 0;
    this.clearPending();
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe' }));
    }
  }

  /** 通过长连接上报成绩（加密信封） */
  reportEnvelope(env: SealedEnvelope): boolean {
    if (!this.connected) return false;
    this.ws?.send(JSON.stringify({ type: 'score', env }));
    return true;
  }
}

export const leaderboardSocket = new LeaderboardSocket();
