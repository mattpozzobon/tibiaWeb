import BaseContainer from "item/base-container";
import Container from "item/container/container";


/**
 * Type guard to check if an object has a container property (Container)
 */
export function hasContainerProperty(obj: any): obj is { container: BaseContainer } {
  return obj && typeof obj === "object" && "container" in obj && obj.container !== undefined;
}

/**
 * Gets the container from an Container
 * Type-safe way to access the container property
 */
export function getContainerFromIContainer(container: Container): BaseContainer {
  return container.container;
}
