interface IPathfinderNode {
  setParent(parent: IPathfinderNode | null): void;
  getParent(): IPathfinderNode | null;

  setClosed(): void;
  isClosed(): boolean;

  setVisited(): void;
  isVisited(): boolean;

  setScore(score: number): void;
  getScore(): number;

  setHeuristic(heuristic: number): void;
  getHeuristic(): number;

  setCost(cost: number): void;
  getCost(): number;
}

export default IPathfinderNode;
