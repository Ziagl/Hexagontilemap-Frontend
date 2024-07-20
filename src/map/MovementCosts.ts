// this class handles movement costs

import { TileType } from '@ziagl/tiled-map-generator';

export enum MovementType {
  LAND,
  WATER,
  AIR,
}

export class MovementCosts {
  // land movement
  // generates a movement cost map based on a given map with tiles
  public static generateMap(map: number[], type: MovementType): number[] {
    let movementCosts: number[] = [];

    map.forEach((tile) => movementCosts.push(MovementCosts.getCosts(tile, type)));

    return movementCosts;
  }

  private static getCosts(tile: TileType, type: MovementType): number {
    switch (type) {
      case MovementType.LAND:
        switch (tile) {
          // unpassable
          case TileType.DEEP_WATER:
          case TileType.SHALLOW_WATER:
          case TileType.MOUNTAIN:
          case TileType.SNOW_MOUNTAIN:
          case TileType.SNOW_WATER:
            return 0;
          case TileType.DESERT:
          case TileType.PLAIN:
          case TileType.SNOW_PLAIN:
            return 1;
          case TileType.FOREST:
          case TileType.SWAMP:
          case TileType.JUNGLE:
          case TileType.HILLS:
          case TileType.SNOW_HILLS:
            return 2;
        }
        break;
      case MovementType.WATER:
        switch (tile) {
          // unpassable
          case TileType.MOUNTAIN:
          case TileType.SNOW_MOUNTAIN:
          case TileType.SNOW_WATER:
          case TileType.DESERT:
          case TileType.PLAIN:
          case TileType.SNOW_PLAIN:
          case TileType.FOREST:
          case TileType.SWAMP:
          case TileType.JUNGLE:
          case TileType.HILLS:
          case TileType.SNOW_HILLS:
            return 0;
          // passable
          case TileType.DEEP_WATER:
          case TileType.SHALLOW_WATER:
            return 1;
        }
      case MovementType.AIR:
      // all tiles are passable
      default:
        return 1;
    }
  }
}
