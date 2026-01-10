import Item from "../item/item";

class Readable extends Item {
  content?: string;

  /*
   * Class Readable
   * Wrapper for items that are readable and may have text
   */

  constructor(id: number) {
    super(id);
  }

  setContent(content: string): void {
    /*
     * Function Readable.setContent
     * Sets the contents of a readable
     */
    this.content = content;
  }

  getContent(): string | null {
    /*
     * Function Readable.getContent
     * Returns the content of a readable
     */
    return this.content || null;
  }

  toJSON(): Record<string, unknown> {
    /*
     * Function Readable.toJSON
     * Serializes a readable item including all properties
     */
    this.cleanup();

    const result: any = {
      id: this.id,
      count: this.count,
      actionId: this.actionId,
      duration: this.duration,
    };
    
    // Include content if it exists (this is the key property for readable items)
    if (this.content !== undefined && this.content !== null) {
      result.content = this.content;
    }
    
    return result;
  }
}

export default Readable;
