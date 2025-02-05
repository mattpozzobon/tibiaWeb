export interface IContainerManager {
  readonly depot: any; // Replace `any` with a specific type for DepotContainer
  readonly equipment: any; // Replace `any` with a specific type for Equipment
  readonly keyring: any; // Replace `any` with a specific type for Keyring
  readonly inbox: any; // Replace `any` with a specific type for Inbox
  readonly MAXIMUM_OPENED_CONTAINERS: number;

  toJSON(): object;
  getContainerFromId(cid: number): any | null; // Replace `any` with the specific container type
  toggleContainer(container: any): void; // Replace `any` with the specific container type
  cleanup(): void;
  checkContainer(container: any): void; // Replace `any` with the specific container type
  checkContainers(): void;
  closeContainer(container: any): void; // Replace `any` with the specific container type
  openKeyring(): void;
}
