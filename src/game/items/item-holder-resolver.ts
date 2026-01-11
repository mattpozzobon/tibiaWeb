import { IContainer } from "interfaces/IThing";
import ITile from "interfaces/ITile";
import Equipment from "../../item/equipment";
import DepotContainer from "item/depot";
import { IItemHolder } from "./item-location";
import { TileHolder, ContainerHolder, EquipmentHolder, DepotHolder } from "./item-holders";


function isObject(x: unknown): x is Record<string, any> {
  return !!x && typeof x === "object";
}

function isTileLike(where: unknown): where is ITile {
  if (!isObject(where)) return false;

  // Your Tile has these, always (methods exist even when itemStack is undefined)
  return (
    "position" in where &&
    typeof (where as any).addThing === "function" &&
    typeof (where as any).addTopThing === "function" &&
    typeof (where as any).peekIndex === "function" &&
    typeof (where as any).removeIndex === "function" &&
    typeof (where as any).getTopParent === "function" &&
    typeof (where as any).getMaximumAddCount === "function"
  );
}

function isDepotLike(where: unknown): where is DepotContainer {
  if (!isObject(where)) return false;

  // DepotContainer has getDepotContainer/getMailContainer and openAtPosition etc.
  return (
    typeof (where as any).getDepotContainer === "function" &&
    typeof (where as any).getMailContainer === "function" &&
    typeof (where as any).openAtPosition === "function" &&
    typeof (where as any).peekIndex === "function" &&
    typeof (where as any).getTopParent === "function"
  );
}

function isEquipmentLike(where: unknown): where is Equipment {
  if (where instanceof Equipment) return true;
  if (!isObject(where)) return false;

  return (
    typeof (where as any).getValidHandSlotForWeapon === "function" &&
    typeof (where as any).hasTwoHandedEquipped === "function" &&
    typeof (where as any).peekIndex === "function" &&
    typeof (where as any).removeIndex === "function" &&
    typeof (where as any).addThing === "function" &&
    typeof (where as any).getTopParent === "function"
  );
}

function isContainerLike(where: unknown): where is IContainer {
  if (!isObject(where)) return false;

  return (
    typeof (where as any).getSize === "function" &&
    typeof (where as any).getSlots === "function" &&
    typeof (where as any).peekIndex === "function" &&
    typeof (where as any).removeIndex === "function" &&
    typeof (where as any).addThing === "function" &&
    typeof (where as any).getTopParent === "function"
  );
}

export function resolveHolder(where: ITile | IContainer | Equipment | DepotContainer): IItemHolder {
  if (isTileLike(where)) return new TileHolder(where);
  if (isDepotLike(where)) return new DepotHolder(where);
  if (isEquipmentLike(where)) return new EquipmentHolder(where as Equipment);
  if (isContainerLike(where)) return new ContainerHolder(where as IContainer);

  const name = (where as any)?.constructor?.name ?? typeof where;
  const keys = isObject(where) ? Object.keys(where).slice(0, 30).join(",") : "";
  throw new Error(`resolveHolder: Unsupported holder type: ${name} keys=[${keys}]`);
}
