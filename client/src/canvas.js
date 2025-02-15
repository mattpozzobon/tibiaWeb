const Canvas = function(id, width, height) {

  /*
   * Class Canvas
   * Container for writing to a HTML5 canvas
   *
   * This is the class used for the main game screen and all additional smaller canvasses
   *
   */

  // Reference the passed canvas or identifier
  this.canvas = this.__reference(id);

  // Set the width and height of the canvas element
  this.canvas.width = width;
  this.canvas.height = height;

  // Reference the canvas context (2d), we do not use WebGL: this still uses the GPU is available
  this.context = this.canvas.getContext("2d");
  this.context.imageSmoothingEnabled = false;

}

Canvas.prototype.setScale = function(scale) {

  /*
   * Function Canvas.setScale
   * Updates the scale of the gamescreen canvas. The canvas is always drawn using 32x32 sprites and we upscale using CSS transforms with the GPU
   */

  this.canvas.style.transform = "scale(%s)".format(scale);

}

Canvas.prototype.renderText = function(text, x, y, color, font) {

  /*
   * Function Canvas.renderText
   * Renders text with a particular color to the canvas
   */

  // Set the font
  this.context.font = font;

  // Calculate the width
  let width = 0.5 * this.context.measureText(text).width;

  // Create an outline of the text by repeating
  this.context.fillStyle = "black";
  for(let i = -1; i < 2; i++) {
    for(let j = -1; j < 2; j++) {
      this.context.fillText(text, x + i - width, y + j);
    }
  }

  // Color and text
  this.context.fillStyle = color;
  this.context.fillText(text, x - width, y);

}

Canvas.prototype.getWorldCoordinates = function(event) {

  /*
   * Function Canvas.getWorldCoordinates
   * Returns the clicked canvas coordinates in world coordinates
   */

  // Where on the canvas the event happens
  let { x, y } =  this.getCanvasCoordinates(event);

  // The scaling that needs to be applied
  let scaling = gameClient.interface.getSpriteScaling();
  let position = gameClient.player.getPosition();

  // The chunk can easily be determined
  let projectedViewPosition = new Position(
    Math.floor(x / scaling) + position.x - 7,
    Math.floor(y / scaling) + position.y - 5,
    position.z
  );

  // Get the sector from the viewed position
  let chunk = gameClient.world.getChunkFromWorldPosition(projectedViewPosition);

  // Somehow we did not recover a chunk
  if(chunk === null) {
    return null;
  }

  // Now apply a correction to get the top tile of the stack
  return chunk.getFirstTileFromTop(projectedViewPosition.projected());

}

Canvas.prototype.getCanvasCoordinates = function(event) {

  /*
   * Function Canvas.getCanvasCoordinates
   * Returns the clicked canvas coordinates from 0, 0 to canvas width & height in pixels
   */

  // Calculate the relative coordinates
  let rect = this.canvas.getBoundingClientRect();

  let x = (event.clientX - rect.left);
  let y = (event.clientY - rect.top);

  return { x, y }

}

Canvas.prototype.black = function() {

  /*
   * Function Canvas.clear
   * Clears the canvas fully and transparently
   */

  // Set the fill style
  this.context.fillStyle = "black";

  this.context.fillRect(
    0, 0,
    this.canvas.width,
    this.canvas.height
  );

}

Canvas.prototype.clear = function() {

  /*
   * Function Canvas.clear
   * Clears the canvas fully and transparently
   */

  // Clear transparently
  this.context.clearRect(
    0, 0,
    this.canvas.width,
    this.canvas.height
  );

}

Canvas.prototype.applyFilter = function(filter) {

  /*
   * Function Canvas.applyFilter
   * Applies a post-processing filter to the rendered canvas
   */

  // Redraw the screen and set the filter back to nothing
  this.__setFilter(filter);
  this.context.drawImage(this.canvas, 0, 0);
  this.__setFilter("none");

}

Canvas.prototype.drawOuterCombatRect = function(position, color) {

  /*
   * Function Canvas.drawOuterCombatRect
   * Draws a 4 width targeting border around the creature
   */

  // Half offset width
  this.drawRect(
    32 * position.x + 0.5,
    32 * position.y + 0.5,
    30,
    color
  );

}

Canvas.prototype.drawInnerCombatRect = function(animation, position) {

  /*
   * Function Canvas.drawInnerCombatRect
   * Draws a 4 width being attacked border around the creature
   */

  this.drawRect(
    32 * position.x + 2.5,
    32 * position.y + 2.5,
    26,
    animation.color
  );

}

Canvas.prototype.drawRect = function(x, y, size, color) {

  /*
   * Function Canvas.drawRect
   * Wrapper function to draw a rectangle
   */

  // Start path and go
  this.context.beginPath();
  this.context.strokeStyle = Interface.prototype.getHexColor(color);
  this.context.lineWidth = 2;
  this.context.rect(x, y, size, size);
  this.context.stroke();

}

Canvas.prototype.drawCharacter = function(creature, position, size, offset) {
  let frames = creature.getCharacterFrames();
  if (frames === null) {
    return;
  }

  let xPattern = creature.__lookDirection % 4;
  let zPattern = (frames.characterGroup.pattern.z > 1 && creature.isMounted()) ? 1 : 0;

  this.__drawCharacter(
    creature.spriteBuffer,
    creature.spriteBufferMount,
    creature.outfit,
    position,
    frames.characterGroup,
    frames.mountGroup,
    frames.characterFrame,
    frames.mountFrame,
    frames.headGroup,
    frames.bodyGroup,
    frames.legsGroup,
    frames.feetGroup,
    frames.hairGroup, // 🟢 Add Hair
    frames.headFrame,
    frames.bodyFrame,
    frames.legsFrame,
    frames.feetFrame,
    frames.hairFrame, // 🟢 Add Hair Frame
    xPattern,
    zPattern,
    size,
    offset,
    frames.isMoving
  );
};


Canvas.prototype.drawDistanceAnimation = function(animation, position) {

  /*
   * Function Canvas.drawDitanceAnimation
   * Draws a projectile animation to the canvas
   */

  // Get the fraction
  let fraction = animation.getFraction();

  let renderPosition = new Position(
    position.x + fraction * (animation.toPosition.x - animation.fromPosition.x),
    position.y + fraction * (animation.toPosition.y - animation.fromPosition.y),
    0
  )

  // Should render light coming from the distance animation
  if(gameClient.interface.settings.isLightingEnabled() && animation.isLight()) {
    gameClient.renderer.__renderLightThing(renderPosition, animation);
  }

  // Draw sprite to the canvas
  return this.drawSprite(animation, renderPosition, 32);

}

Canvas.prototype.drawSprite = function(thing, position, size) {

  /*
   * Function Canvas.drawSprite
   * Draws a particular thing to the canvas: this function is called MANY times
   */

  // Things always have frame group none
  let frameGroup = thing.getFrameGroup(FrameGroup.prototype.NONE);

  // Get the frame and pattern of this thing
  let frame = thing.getFrame();
  let pattern = thing.getPattern();

  // Must handle big sprites: go over width and height
  for(let x = 0; x < frameGroup.width; x++) {
    for(let y = 0; y < frameGroup.height; y++) {
      for(let l = 0; l < frameGroup.layers; l++) {

        // Calculate the sprite index
        let index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, l, x, y);
        
        // Draw the actual sprite
        this.__drawSprite(frameGroup.getSprite(index), position, x, y, size);
  
      }
    }
  }
  
}

Canvas.prototype.drawSpriteOverlay = function(thing, position, size) {

  /*
   * Function Canvas.drawSpriteOverlay
   * Draws the blurred overlay over a draggable thing
   */

  // Get the required information
  let frameGroup = thing.getFrameGroup(FrameGroup.prototype.GROUP_IDLE);
  let frame = thing.getFrame();
  let pattern = thing.getPattern();

  // Must handle big sprites
  for(let x = 0; x < frameGroup.width; x++) {
    for(let y = 0; y < frameGroup.height; y++) {
      for(let l = 0; l < frameGroup.layers; l++) {

        let index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, l, x, y);

        gameClient.renderer.outlineCanvas.createOutline(frameGroup.sprites[index]);

        this.context.drawImage(
          gameClient.renderer.outlineCanvas.canvas,
          0, 0,
          33, 33,
          position.x * 32 - 1,
          position.y * 32 - 1,
          33, 33
        );
  
      }
    }
  }
  
}

Canvas.prototype.__setFilter = function(filter) {

  /*
   * Function Canvas.__setFilter
   * Sets an SVG filter for the canvas
   */

  switch(filter) {
    case "matrix": return this.context.filter = "url(#matrix)";
    case "greyscale": return this.context.filter = "grayscale()";
    case "hue": return this.context.filter = "hue-rotate(" + (gameClient.getFrame() % 360) + "deg)";
    case "invert": return this.context.filter = "invert()";
    case "sepia": return this.context.filter = "sepia()";
    case "blur": return this.context.filter = "blur(4px)";
    case "saturate": return this.context.filter = "saturate(20%)";
    case "none": return this.context.filter = "none";
  }

}

Canvas.prototype.__drawSprite = function(sprite, position, x, y, size) {

  /*
   * Function Canvas.__drawSprite
   * Internal function to draw a sprite to the game screen
   */

  // Stop on remaining null pointers
  if(sprite === null) {
    return;
  }

  // Increment the drawcall number
  gameClient.renderer.drawCalls++;

  // Draw the sprite to the screen from the spritebuffer
  this.context.drawImage(
    sprite.src,
    32 * sprite.position.x,
    32 * sprite.position.y,
    32, 32,
    Math.round(32 * (position.x - x)),
    Math.round(32 * (position.y - y)),
    32, 32
  );

}

Canvas.prototype.__drawCharacter = function(
  spriteBuffer,
  spriteBufferMount,
  outfit,
  position,
  characterGroup,
  mountGroup,
  characterFrame,
  mountFrame,
  headGroup,
  bodyGroup,
  legsGroup,
  feetGroup,
  hairGroup, // 🟢 Add Hair
  headFrame,
  bodyFrame,
  legsFrame,
  feetFrame,
  hairFrame, // 🟢 Add Hair Frame
  xPattern,
  zPattern,
  size,
  offset
) {
  let drawPosition = new Position(position.x - offset, position.y - offset);

  // 🟢 Draw Base Outfit
  this.__drawCharacterLayer(spriteBuffer, outfit, characterGroup, characterFrame, xPattern, zPattern, drawPosition, size, 0);

  // 🟢 Draw Equipment (If Exists)
  if (headGroup) this.__drawCharacterLayer(spriteBuffer, outfit, headGroup, headFrame, xPattern, zPattern, drawPosition, size, 0);
  if (bodyGroup) this.__drawCharacterLayer(spriteBuffer, outfit, bodyGroup, bodyFrame, xPattern, zPattern, drawPosition, size, 0);
  if (legsGroup) this.__drawCharacterLayer(spriteBuffer, outfit, legsGroup, legsFrame, xPattern, zPattern, drawPosition, size, 0);
  if (feetGroup) this.__drawCharacterLayer(spriteBuffer, outfit, feetGroup, feetFrame, xPattern, zPattern, drawPosition, size, 0);

  // 🟢 If no helmet, draw hair
  if (!headGroup && hairGroup) {
    const spriteBufferHair = new SpriteBuffer(64);
    this.__drawCharacterLayer(spriteBufferHair, outfit, hairGroup, hairFrame, xPattern, zPattern, drawPosition, size, 0, true);
  }
  
  
  // 🟢 Draw Mount
  if (zPattern === 1 && mountGroup) {
    let mountSprite = mountGroup.getSpriteId(mountFrame, xPattern, 0, 0, 0, 0, 0);
    if (mountSprite !== 0) {
      this.__drawSprite(spriteBufferMount.get(mountSprite), drawPosition, 0, 0, size);
    }
  }
};


Canvas.prototype.__drawCharacterLayer = function(
  spriteBuffer,
  outfit,
  group,
  frame,
  xPattern,
  zPattern,
  position,
  size,
  yPattern,
  hasMask = false
) {
  if (!group) return; // If no group, nothing to draw.
  
  for (let x = 0; x < group.width; x++) {
    for (let y = 0; y < group.height; y++) {
      let spriteId = group.getSpriteId(frame, xPattern, yPattern, zPattern, 0, x, y);
      if (spriteId === 0) continue;

      if (hasMask) {
        if (!spriteBuffer.has(spriteId)) {
          spriteBuffer.addComposedOutfit(spriteId, outfit, group, frame, xPattern, zPattern, x, y);
        }
      }

      this.__drawSprite(spriteBuffer.get(spriteId), position, x, y, size);
    }
  }
};


Canvas.prototype.__reference = function(id) {

  /*
   * Function Canvas.__reference
   * References a new or existing canvas
   */

  // Create an offscreen canvas or find the one existing in the DOM from string, or use a passed canvas
  if(id === null) {
    return document.createElement("canvas");
  }

  // If the passed identifier is a string: read it from the DOM
  if(typeof id === "string") {
    return document.getElementById(id);
  }

  return id;

}
