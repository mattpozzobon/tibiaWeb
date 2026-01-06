class BinaryHeap<T extends { getScore: () => number }> {
  private content: T[];

  constructor() {
    /*
     * Class BinaryHeap
     * Implementation of a simple binary heap used as a priority queue in e.g. the A* pathfinding algorithm and the event scheduler.
     * Binary heap nodes must implement the getScore() API.
     */
    this.content = [];
  }

  hasExecutedUntil(score: number): boolean {
    /*
     * Returns whether the next element's score is greater than the given score.
     */
    return this.isEmpty() || this.next().getScore() > score;
  }

  isEmpty(): boolean {
    /*
     * Returns true if the heap is empty.
     */
    return this.content.length === 0;
  }

  remove(node: T): void {
    /*
     * Removes an item from the heap.
     */
    const index = this.content.indexOf(node);
    if (index === -1) {
      console.error("Attempted to remove a node that does not exist in the heap");
      return;
    }

    const end = this.content.pop();
    if (index < this.content.length && end) {
      this.content[index] = end;
      if (end.getScore() < node.getScore()) {
        this.__sinkDown(index);
      } else {
        this.__bubbleUp(index);
      }
    }
  }

  next(): T {
    /*
     * Returns a reference to the next scheduled node in the heap.
     */
    if (this.isEmpty()) {
      throw new Error("Heap is empty");
    }
    return this.content[0];
  }

  push(element: T): void {
    /*
     * Adds an element to the heap.
     */
    if (typeof element.getScore !== "function") {
      throw new Error("Added node to binary heap that does not implement the getScore() API");
    }

    this.content.push(element);
    this.__sinkDown(this.content.length - 1);
  }

  pop(): T {
    /*
     * Removes and returns the top element of the heap.
     */
    if (this.isEmpty()) {
      throw new Error("Heap is empty");
    }

    const result = this.content[0];
    const end = this.content.pop();

    if (this.content.length > 0 && end) {
      this.content[0] = end;
      this.__bubbleUp(0);
    }

    return result;
  }

  size(): number {
    /*
     * Returns the size of the heap.
     */
    return this.content.length;
  }

  rescoreElement(node: T): void {
    /*
     * Rescores an element within the heap.
     */
    const index = this.content.indexOf(node);
    if (index === -1) {
      console.error("Attempted to rescore a node that does not exist in the heap");
      return;
    }
    this.__sinkDown(index);
  }

  private __sinkDown(n: number): void {
    /*
     * Sinks an element down to its proper location in the heap.
     */
    const element = this.content[n];

    while (n > 0) {
      const parentN = ((n + 1) >> 1) - 1;
      const parent = this.content[parentN];

      if (element.getScore() >= parent.getScore()) {
        break;
      }

      this.content[parentN] = element;
      this.content[n] = parent;
      n = parentN;
    }
  }

  private __bubbleUp(n: number): void {
    /*
     * Bubbles an element up to its proper location in the heap.
     */
    const element = this.content[n];
    const elemScore = element.getScore();
    const length = this.content.length;

    while (true) {
      const child1N = (n << 1) + 1;
      const child2N = child1N + 1;

      let swap: number | null = null;
      let child1Score: number | undefined;

      if (child1N < length) {
        const child1 = this.content[child1N];
        child1Score = child1.getScore();
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      if (child2N < length) {
        const child2 = this.content[child2N];
        const child2Score = child2.getScore();
        if (child2Score < (swap === null ? elemScore : child1Score!)) {
          swap = child2N;
        }
      }

      if (swap === null) {
        break;
      }

      this.content[n] = this.content[swap];
      this.content[swap] = element;
      n = swap;
    }
  }
}

export default BinaryHeap;
