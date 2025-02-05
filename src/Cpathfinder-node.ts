class PathfinderNode {
  /*
   * Class PathfinderNode
   * Wrapper for parameters used in A* pathfinding
   */

  private __parent: PathfinderNode | null = null;
  private __closed: boolean = false;
  private __visited: boolean = false;

  // Scores: f is the heap score, g is the total cost, and h is the heuristic score
  private __f: number = 0;
  private __g: number = 0;
  private __h: number = 0;

  setParent(parent: PathfinderNode | null): void {
    /*
     * Function PathfinderNode.setParent
     * Sets the parent of the pathfinder node
     */
    this.__parent = parent;
  }

  getParent(): PathfinderNode | null {
    /*
     * Function PathfinderNode.getParent
     * Returns the parent of a pathfinder node
     */
    return this.__parent;
  }

  setClosed(): void {
    /*
     * Function PathfinderNode.setClosed
     * Sets the node to closed for searching
     */
    this.__closed = true;
  }

  isClosed(): boolean {
    /*
     * Function PathfinderNode.isClosed
     * Returns true if the pathfinding node is closed
     */
    return this.__closed;
  }

  isVisited(): boolean {
    /*
     * Function PathfinderNode.isVisited
     * Returns true if the pathfinding node is visited
     */
    return this.__visited;
  }

  setVisited(): void {
    /*
     * Function PathfinderNode.setVisited
     * Sets the pathfinding node to visited
     */
    this.__visited = true;
  }

  getScore(): number {
    /*
     * Function PathfinderNode.getScore
     * Returns the heap score of the particular node
     */
    return this.__f;
  }

  setScore(score: number): void {
    /*
     * Function PathfinderNode.setScore
     * Sets the new heap score of a particular node
     */
    this.__f = score;
  }

  setHeuristic(heuristic: number): void {
    /*
     * Function PathfinderNode.setHeuristic
     * Sets the heuristic score of a particular node
     */
    this.__h = heuristic;
  }

  getHeuristic(): number {
    /*
     * Function PathfinderNode.getHeuristic
     * Returns the heuristic value of the node
     */
    return this.__h;
  }

  getCost(): number {
    /*
     * Function PathfinderNode.getCost
     * Returns the total cost of the node
     */
    return this.__g;
  }

  setCost(cost: number): void {
    /*
     * Function PathfinderNode.setCost
     * Sets the total cost of the node
     */
    this.__g = cost;
  }
}

export default PathfinderNode;