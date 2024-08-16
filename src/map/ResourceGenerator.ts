import { LandscapeType, TerrainType } from "@ziagl/tiled-map-generator";
import { Resource, ResourceTile, ResourceType } from "@ziagl/tiled-map-resources";

export class ResourceGenerator {
    // generates a movement cost map based on a given map with tiles
    public static generateMap(terrainMap: number[], landscapeMap: number[], rows: number, columns: number): ResourceTile[] {
        let map: ResourceTile[] = [];
        for(let i=0; i < rows; i++) {
            const terrainMapRow = terrainMap.slice(i * columns, (i + 1) * columns);
            const landscapeMapRow = landscapeMap.slice(i * columns, (i + 1) * columns);
            for(let j=0; j < columns; j++) {
                map.push(ResourceGenerator.getResourceOfTile(terrainMapRow[j], landscapeMapRow[j]));
            }
        }
        return map;
    }

    // generates a resource tile based on terrain and landscape type
    private static getResourceOfTile(terrain: number, landscape: number): ResourceTile {
        let resourceTile = new ResourceTile();
        switch(terrain) {
            case TerrainType.SHALLOW_WATER:
                resourceTile.addResource(new Resource(ResourceType.FOOD, 1));
                resourceTile.addResource(new Resource(ResourceType.GOLD, 1));
                break;
            case TerrainType.DEEP_WATER:
            case TerrainType.TUNDRA:
                resourceTile.addResource(new Resource(ResourceType.FOOD, 1));
                break;
            case TerrainType.PLAIN:
            case TerrainType.TUNDRA_HILLS:
                resourceTile.addResource(new Resource(ResourceType.FOOD, 1));
                resourceTile.addResource(new Resource(ResourceType.PRODUCTION, 1));
                break;
            case TerrainType.PLAIN_HILLS:
                resourceTile.addResource(new Resource(ResourceType.FOOD, 1));
                resourceTile.addResource(new Resource(ResourceType.PRODUCTION, 2));
                break;
            case TerrainType.DESERT_HILLS:
            case TerrainType.SNOW_HILLS:
                resourceTile.addResource(new Resource(ResourceType.PRODUCTION, 1));
                break;
            case TerrainType.GRASS:
                resourceTile.addResource(new Resource(ResourceType.FOOD, 2));
                break;
            case TerrainType.GRASS_HILLS:
                resourceTile.addResource(new Resource(ResourceType.FOOD, 2));
                resourceTile.addResource(new Resource(ResourceType.PRODUCTION, 1));
                break;
            case TerrainType.DESERT:
            case TerrainType.SNOW:
                break;
        }
        switch(landscape) {
            case LandscapeType.REEF:
                resourceTile.addResource(new Resource(ResourceType.FOOD, 1));
                resourceTile.addResource(new Resource(ResourceType.PRODUCTION, 1));
                break;
            case LandscapeType.JUNGLE:
            case LandscapeType.SWAMP:
                resourceTile.addResource(new Resource(ResourceType.FOOD, 1));
                break;
            case LandscapeType.FOREST:
                resourceTile.addResource(new Resource(ResourceType.PRODUCTION, 1));
                break;
            case LandscapeType.OASIS:
                resourceTile.addResource(new Resource(ResourceType.FOOD, 3));
                resourceTile.addResource(new Resource(ResourceType.GOLD, 1));
                break;
            case LandscapeType.NONE:    
            case LandscapeType.VOLCANO:
            case LandscapeType.ICE:
                break;
        }
        return resourceTile;
    }
}