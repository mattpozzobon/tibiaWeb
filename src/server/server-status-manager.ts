import { Config } from "../types/config";

export class ServerStatusManager {
  private __status: string | null = null;
  private readonly STATUS: Config["SERVER"]["STATUS"];

  constructor(statusConfig: Config["SERVER"]["STATUS"]) {
    this.STATUS = statusConfig;
  }

  // ============================================================================
  // Status Getters
  // ============================================================================

  getStatus(): string | null {
    return this.__status;
  }

  isOpen(): boolean {
    return this.__status === this.STATUS.OPEN;
  }

  isOpening(): boolean {
    return this.__status === this.STATUS.OPENING;
  }

  isClosing(): boolean {
    return this.__status === this.STATUS.CLOSING;
  }

  isClosed(): boolean {
    return this.__status === this.STATUS.CLOSED;
  }

  isMaintenance(): boolean {
    return this.__status === this.STATUS.MAINTENANCE;
  }

  isShutdown(): boolean {
    return this.isClosing();
  }

  // ============================================================================
  // Status Setters
  // ============================================================================

  setOpen(): void {
    this.__status = this.STATUS.OPEN;
  }

  setOpening(): void {
    this.__status = this.STATUS.OPENING;
  }

  setClosing(): void {
    this.__status = this.STATUS.CLOSING;
  }

  setClosed(): void {
    this.__status = this.STATUS.CLOSED;
  }

  setMaintenance(): void {
    this.__status = this.STATUS.MAINTENANCE;
  }

  setStatus(status: string): void {
    this.__status = status;
  }

  // ============================================================================
  // Status Validation
  // ============================================================================

  canAcceptConnections(): boolean {
    return this.isOpen();
  }

  canAcceptMaintenanceConnections(): boolean {
    return this.isOpen() || this.isMaintenance();
  }

  isRestricted(): boolean {
    return this.isClosing() || this.isClosed() || this.isMaintenance();
  }

  canReopen(): boolean {
    return this.isClosed() || this.isMaintenance();
  }

  canShutdown(): boolean {
    return !this.isClosing();
  }

  canEnterMaintenance(): boolean {
    return !this.isClosing() && !this.isClosed() && !this.isMaintenance();
  }
}
