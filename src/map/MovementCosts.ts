// this class handles movement costs

import { TerrainType } from '@ziagl/tiled-map-generator';

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

  private static getCosts(tile: TerrainType, type: MovementType): number {
    switch (type) {
      case MovementType.LAND:
        switch (tile) {
          // unpassable
          case TerrainType.DEEP_WATER:
          case TerrainType.SHALLOW_WATER:
          case TerrainType.MOUNTAIN:
            return 0;
          case TerrainType.DESERT:
          case TerrainType.PLAIN:
          case TerrainType.GRASS:
          case TerrainType.TUNDRA:
          case TerrainType.SNOW:
            return 1;
          case TerrainType.DESERT_HILLS:
          case TerrainType.PLAIN_HILLS:
          case TerrainType.GRASS_HILLS:
          case TerrainType.TUNDRA_HILLS:
          case TerrainType.SNOW_HILLS:
            return 2;
        }
        break;
      case MovementType.WATER:
        switch (tile) {
          // unpassable
          case TerrainType.DESERT:
          case TerrainType.DESERT_HILLS:
          case TerrainType.PLAIN:
          case TerrainType.PLAIN_HILLS:
          case TerrainType.GRASS:
          case TerrainType.GRASS_HILLS:
          case TerrainType.TUNDRA:
          case TerrainType.TUNDRA_HILLS:
          case TerrainType.SNOW:
          case TerrainType.SNOW_HILLS:
          case TerrainType.MOUNTAIN:
            return 0;
          // passable
          case TerrainType.DEEP_WATER:
          case TerrainType.SHALLOW_WATER:
            return 1;
        }
      case MovementType.AIR:
      // all tiles are passable
      default:
        return 1;
    }
  }
}
