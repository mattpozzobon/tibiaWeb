import Item from "./item";

class Rune extends Item {
  private charges: number;

  /*
   * Class Rune
   * Container for a rune that inherits from Item
   */

  constructor(id: number) {
    super(id);

    // Set the initial charges from the prototype metadata
    this.charges = this.getMaximumCharges();
  }

  getMaximumCharges(): number {
    /*
     * Function Rune.getMaximumCharges
     * Returns the number of initial charges from the prototype definitions
     */

    // Read from the prototype
    const proto = this.getPrototype();

    // Check if the number of charges exists
    if (proto.properties?.hasOwnProperty("charges")) {
      return Number(proto.properties.charges);
    }

    return 1;
  }
}

export default Rune;
