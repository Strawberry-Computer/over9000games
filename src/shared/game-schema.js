// Game schema validation for QuickJS-generated games

export function validateGameSchema(gameDefinition) {
  const errors = [];

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

  // Validate sprites
  if (gameDefinition.sprites && typeof gameDefinition.sprites !== 'object') {
    errors.push('Sprites must be an object');
  } else if (gameDefinition.sprites) {
    Object.entries(gameDefinition.sprites).forEach(([spriteId, sprite]) => {
      if (!sprite.id || typeof sprite.id !== 'string') {
        errors.push(`Sprite ${spriteId} must have a valid id`);
      }
      if (typeof sprite.width !== 'number' || sprite.width !== 8) {
        errors.push(`Sprite ${spriteId} width must be 8 pixels`);
      }
      if (typeof sprite.height !== 'number' || sprite.height !== 8) {
        errors.push(`Sprite ${spriteId} height must be 8 pixels`);
      }
      if (!Array.isArray(sprite.layers) || sprite.layers.length !== 4) {
        errors.push(`Sprite ${spriteId} must have exactly 4 layers`);
      } else {
        sprite.layers.forEach((layer, i) => {
          if (!Array.isArray(layer) || layer.length !== 8) {
            errors.push(`Sprite ${spriteId} layer ${i} must be an array of 8 bytes`);
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

  // Validate update function
  if (!gameDefinition.update) {
    errors.push('Game update function is required');
  } else if (typeof gameDefinition.update !== 'function' && typeof gameDefinition.update !== 'string') {
    errors.push('Game update must be a function or function string');
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
  // Create a clean copy
  const sanitized = {
    metadata: {
      title: String(gameDefinition.metadata?.title || 'Untitled Game'),
      description: String(gameDefinition.metadata?.description || ''),
      controls: Array.isArray(gameDefinition.metadata?.controls) ?
        gameDefinition.metadata.controls : []
    },
    sprites: {},
    tiles: {},
    palette: Array.isArray(gameDefinition.palette) ?
      gameDefinition.palette.slice(0, 16) : [],
    initialState: gameDefinition.initialState || {}
  };

  // Sanitize sprites
  if (gameDefinition.sprites && typeof gameDefinition.sprites === 'object') {
    Object.entries(gameDefinition.sprites).forEach(([spriteId, sprite]) => {
      if (sprite && typeof sprite === 'object' &&
          sprite.width === 8 && sprite.height === 8 &&
          Array.isArray(sprite.layers) && sprite.layers.length === 4) {
        sanitized.sprites[spriteId] = {
          id: String(sprite.id || spriteId),
          width: 8,
          height: 8,
          layers: sprite.layers.map(layer =>
            Array.isArray(layer) && layer.length === 8 ?
            layer.map(byte => Math.max(0, Math.min(255, Math.floor(Number(byte) || 0)))) :
            new Array(8).fill(0)
          )
        };
      }
    });
  }

  // Sanitize tiles
  if (gameDefinition.tiles && typeof gameDefinition.tiles === 'object') {
    Object.entries(gameDefinition.tiles).forEach(([tileId, tile]) => {
      if (tile && typeof tile === 'object' &&
          tile.width === 8 && tile.height === 8 &&
          Array.isArray(tile.layers) && tile.layers.length === 4) {
        sanitized.tiles[tileId] = {
          id: String(tile.id || tileId),
          width: 8,
          height: 8,
          layers: tile.layers.map(layer =>
            Array.isArray(layer) && layer.length === 8 ?
            layer.map(byte => Math.max(0, Math.min(255, Math.floor(Number(byte) || 0)))) :
            new Array(8).fill(0)
          )
        };
      }
    });
  }

  // Convert update function to string if needed
  if (typeof gameDefinition.update === 'function') {
    sanitized.updateCode = gameDefinition.update.toString();
  } else if (typeof gameDefinition.update === 'string') {
    sanitized.updateCode = gameDefinition.update;
  }

  return sanitized;
}