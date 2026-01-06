import Item from "./item";

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
     * Serializes a readable item
     */
    this.cleanup();

    return {
      id: this.id,
      actionId: this.actionId,
      content: this.content,
    };
  }
}

export default Readable;
