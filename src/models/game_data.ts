import { MapSize, MapType } from "@ziagl/tiled-map-generator";

export class GameData extends Phaser.Plugins.BasePlugin {
    public mapSize:MapSize;
    public mapType:MapType;
    
    constructor(pluginManager: any) {
        super(pluginManager);

        // default settings for map
        this.mapSize = MapSize.SMALL;
        this.mapType = MapType.CONTINENTS;
    }
}