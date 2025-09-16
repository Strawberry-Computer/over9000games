// Game schema validation for QuickJS-generated games

export function validateGameSchema(gameDefinition) {
  const errors = [];

  console.log("Validating game schema:", gameDefinition);

  // Check basic structure
  if (!gameDefinition || typeof gameDefinition !== 'object') {
    errors.push('Game definition must be an object');
    return { valid: false, errors };
  }

  // Validate metadata
  if (!gameDefinition.metadata || typeof gameDefinition.metadata !== 'object') {
    errors.push('Game metadata is required');
  } else {
    if (!gameDefinition.metadata.title || typeof gameDefinition.metadata.title !== 'string') {
      errors.push('Game title is required and must be a string');
    }
    if (!gameDefinition.metadata.description || typeof gameDefinition.metadata.description !== 'string') {
      errors.push('Game description is required and must be a string');
    }
    if (gameDefinition.metadata.controls && !Array.isArray(gameDefinition.metadata.controls)) {
      errors.push('Game controls must be an array');
    }
  }

  // Validate sprites (new simplified format)
  if (gameDefinition.sprites && !Array.isArray(gameDefinition.sprites)) {
    errors.push('Sprites must be an array');
  } else if (gameDefinition.sprites) {
    gameDefinition.sprites.forEach((sprite, spriteIndex) => {
      if (!Array.isArray(sprite)) {
        errors.push(`Sprite ${spriteIndex} must be an array of layers`);
      } else {
        sprite.forEach((layer, layerIndex) => {
          if (!Array.isArray(layer) || layer.length !== 8) {
            errors.push(`Sprite ${spriteIndex} layer ${layerIndex} must be an array of 8 bytes`);
          }
        });
      }
    });
  }

  // Validate tiles
  if (gameDefinition.tiles && typeof gameDefinition.tiles !== 'object') {
    errors.push('Tiles must be an object');
  } else if (gameDefinition.tiles) {
    Object.entries(gameDefinition.tiles).forEach(([tileId, tile]) => {
      if (!tile.id || typeof tile.id !== 'string') {
        errors.push(`Tile ${tileId} must have a valid id`);
      }
      if (typeof tile.width !== 'number' || tile.width !== 8) {
        errors.push(`Tile ${tileId} width must be 8 pixels`);
      }
      if (typeof tile.height !== 'number' || tile.height !== 8) {
        errors.push(`Tile ${tileId} height must be 8 pixels`);
      }
      if (!Array.isArray(tile.layers) || tile.layers.length !== 4) {
        errors.push(`Tile ${tileId} must have exactly 4 layers`);
      }
    });
  }

  // Validate palette
  if (gameDefinition.palette) {
    if (!Array.isArray(gameDefinition.palette)) {
      errors.push('Palette must be an array');
    } else if (gameDefinition.palette.length > 16) {
      errors.push('Palette cannot have more than 16 colors');
    } else {
      gameDefinition.palette.forEach((color, i) => {
        if (typeof color !== 'number' || color < 0 || color > 0xFFFFFF) {
          errors.push(`Palette color ${i} must be a valid hex color (0x000000-0xFFFFFF)`);
        }
      });
    }
  }

  // Validate update function (accept either update function or updateCode string)
  if (!gameDefinition.update && !gameDefinition.updateCode) {
    errors.push('Game update function or updateCode is required');
  } else if (gameDefinition.update && typeof gameDefinition.update !== 'function' && typeof gameDefinition.update !== 'string') {
    errors.push('Game update must be a function or function string');
  } else if (gameDefinition.updateCode && typeof gameDefinition.updateCode !== 'string') {
    errors.push('Game updateCode must be a string');
  }

  // Validate initial state
  if (gameDefinition.initialState && typeof gameDefinition.initialState !== 'object') {
    errors.push('Initial state must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function sanitizeGameDefinition(gameDefinition) {
  // Just validate and return the original if valid
  const validation = validateGameSchema(gameDefinition);
  if (!validation.valid) {
    throw new Error(`Invalid game definition: ${validation.errors.join(', ')}`);
  }

  return gameDefinition;
}