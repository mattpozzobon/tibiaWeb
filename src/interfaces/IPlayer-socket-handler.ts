export interface ISocketHandler {
  setLogoutEvent(logoutEvent: any): void; // Replace `any` with a specific type if known
  write(buffer: Buffer): void;
  attachController(gameSocket: any): void; // Replace `any` with a specific type if known
  disconnect(): void;
  getController(): any | null; // Replace `any` with a specific type if known
  getLastPacketReceived(): number | null;
  addSpectator(gameSocket: any): void; // Replace `any` with a specific type if known
}
