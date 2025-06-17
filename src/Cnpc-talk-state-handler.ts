export class TalkStateHandler {
  private conversationHandler: any;
  private __talkState: (player: any, keyword: string) => void = () => {};
  private __baseTalkState: (state?: any) => void = () => {};
  private __baseTalkStateBound: (state?: any) => void = () => {};

  constructor(conversationHandler: any) {
    /*
     * Class TalkStateHandler
     * Code that handles and remembers the NPC talk state
     */
    this.conversationHandler = conversationHandler;
  }

  handle(player: any, keyword: string): void {
    /*
     * Applies the correct bound state function to the keyword.
     */
    this.__talkState(player, keyword);
  }

  isDefaultState(): boolean {
    /*
     * Returns true if the NPC is in the default base state.
     */
    return this.__talkState === this.__baseTalkStateBound;
  }

  setTalkState(
    talkState: (player: any, keyword: string) => void,
    propertyState: object = {}
  ): void {
    /*
     * Sets the current NPC talk state to a particular callback function.
     */
    if (talkState === this.__baseTalkState) {
      this.reset();
      return;
    }

    this.__talkState = talkState.bind(this.conversationHandler, propertyState);
  }

  reset(): void {
    /*
     * Resets the current NPC talk state to the base state.
     */
    this.__talkState = this.__baseTalkStateBound;
  }

  setBaseState(baseState: (state?: any) => void): void {
    /*
     * Sets the initial base state of the NPC used after a reset.
     */
    this.__baseTalkState = baseState;
    this.__baseTalkStateBound = baseState.bind(
      this.conversationHandler,
      {}
    );

    this.setTalkState(baseState);
  }
}
