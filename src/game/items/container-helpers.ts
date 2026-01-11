import { IContainer } from "../../interfaces/IThing";
import { IBaseContainer } from "../../interfaces/IBase-container";

/**
 * Type guard to check if an object has a container property (IContainer)
 */
export function hasContainerProperty(obj: any): obj is { container: IBaseContainer } {
  return obj && typeof obj === "object" && "container" in obj && obj.container !== undefined;
}

/**
 * Gets the container from an IContainer
 * Type-safe way to access the container property
 */
export function getContainerFromIContainer(container: IContainer): IBaseContainer {
  return container.container;
}
