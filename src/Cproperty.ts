export class Property<T> {
  /*
   * Class Property
   * Wrapper for a single value property
   */

  private __value: T;

  constructor(value: T) {
    this.__value = value;
  }

  set(value: T): T {
    /*
     * Sets the property value
     */
    this.__value = value;
    return this.__value;
  }

  get(): T {
    /*
     * Returns the property value
     */
    return this.__value;
  }

  toJSON(): T {
    /*
     * Serializes the class to JSON
     */
    return this.__value;
  }
}
