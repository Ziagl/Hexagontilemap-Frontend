import { CubeCoordinates } from "honeycomb-grid";
import { Dictionary } from "../interfaces/IDictionary";
import { Scene } from "phaser";

export class MovementRenderer{
    private readonly colorStartMarker = 0x800010;
    private readonly colorMovementMarker = 0x100089;
    private movementMarkers: Phaser.GameObjects.Graphics[] = [];
    private tiles:Dictionary<Phaser.Tilemaps.Tile> = {};
    private map: Phaser.Tilemaps.Tilemap;
    private scene: Scene;

    constructor(scene:Scene, tiles:Dictionary<Phaser.Tilemaps.Tile>, map: Phaser.Tilemaps.Tilemap) {
        this.tiles = tiles;
        this.map = map;
        this.scene = scene;
    }

    public create(tileCoordinates:CubeCoordinates[]) {
        this.reset();
        
        let startTile = true;
        const markerOffset = 0.5;
        // creates a hexagonal movement marker based on tile size
        tileCoordinates.forEach(coordinates => {
            // find tile by cube coordinates
            const key:string = 'q:'+coordinates.q+'r:'+coordinates.r+'s:'+coordinates.s;
            if(Object.keys(this.tiles).includes(key)) {
                //console.log("found tile at "+key);
                const tile = this.tiles[key];

                let movementMarker = this.scene.add.graphics();
                if(startTile) {
                    movementMarker.lineStyle(2, this.colorStartMarker, 1);
                } else {
                    movementMarker.lineStyle(2, this.colorMovementMarker, 1);
                }
                movementMarker.beginPath();
                movementMarker.moveTo(markerOffset, (this.map.tileHeight / 4) + markerOffset);
                movementMarker.lineTo(markerOffset, ((this.map.tileHeight / 4) * 3) - markerOffset);
                movementMarker.lineTo((this.map.tileWidth / 2) - markerOffset, this.map.tileHeight - markerOffset);
                movementMarker.lineTo(this.map.tileWidth - markerOffset, ((this.map.tileHeight / 4) * 3) - markerOffset);
                movementMarker.lineTo(this.map.tileWidth - markerOffset, (this.map.tileHeight / 4) + markerOffset);
                movementMarker.lineTo((this.map.tileWidth / 2) - markerOffset, markerOffset);
                movementMarker.lineTo(markerOffset, (this.map.tileHeight / 4) + markerOffset);
                movementMarker.closePath();
                movementMarker.strokePath();

                movementMarker.x = tile.pixelX;
                movementMarker.y = tile.pixelY;
                movementMarker.alpha = 1;

                this.movementMarkers.push(movementMarker);
                startTile = false;
            } else {
                console.log(`Key ${key} not found.`);
            }
        });
    }

    public isVisible() {
        return this.movementMarkers.length > 0;
    }

    public reset() {
        this.movementMarkers.forEach(marker => marker.destroy());
        this.movementMarkers = [];
    }
}