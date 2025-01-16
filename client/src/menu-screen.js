const ScreenMenu = function(id) {

  /*
   * Class ScreenMenu
   * Wrapper for the menu that displays on the main game screen
   */

  // Inherits from menu
  Menu.call(this, id);

}

ScreenMenu.prototype = Object.create(Menu.prototype);
ScreenMenu.prototype.constructor = ScreenMenu;

ScreenMenu.prototype.click = function(event) {
  /*
   * Function ScreenMenu.click
   * Callback fired specially for the ScreenMenu after a button is clicked
   */

  // Get the selected world object
  let object = Mouse.prototype.getWorldObject(this.downEvent);

  // Take action depending on the button
  switch (this.__getAction(event)) {
    case "look":
      gameClient.mouse.look(object);
      break;
    case "use":
      gameClient.mouse.use(object);
      break;
    case "outfits":
      gameClient.interface.modalManager.open("outfit-modal");
      break;
  }

  this.close(); // Explicitly close the menu
};

ScreenMenu.prototype.addOption = function(action, label) {
  /*
   * Function ScreenMenu.addOption
   * Dynamically adds a new button to the menu if it doesn't already exist.
   *
   * @param {string} action - The action identifier for the button.
   * @param {string} label - The text displayed on the button.
   */

  // Check if a button with the same action already exists
  if (this.element.querySelector(`button[action="${action}"]`)) {
    return; // Do not add the button if it exists
  }

  // Create a new button
  const button = document.createElement("button");
  button.setAttribute("action", action);
  button.textContent = label;
  button.classList.add("dynamic-option"); // Mark as dynamic

  // Add a click handler for the button
  button.addEventListener("click", (event) => this.click(event));

  // Append the button to the menu's DOM
  this.element.appendChild(button);
};

ScreenMenu.prototype.removeDynamicOptions = function() {
  /*
   * Function ScreenMenu.removeDynamicOptions
   * Removes all dynamically added buttons from the menu.
   */
  const dynamicButtons = this.element.querySelectorAll('.dynamic-option');
  dynamicButtons.forEach(button => button.remove());
};