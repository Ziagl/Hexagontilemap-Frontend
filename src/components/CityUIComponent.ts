import { IComponent } from "../interfaces/IComponent";
import { City } from "../models/City";

export  default class CityUIComponent implements IComponent {
    private readonly font = '10px Courier';
    private readonly color = '#000000';
    private readonly depth = 1000;
    private cityBorder: Phaser.GameObjects.Graphics;
    private readonly borderLineStrength = 2;
    private readonly borderLineColor = 0xFF7F27;
    private readonly borderLineAlpha = 1;
    
    private gameObject: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
    
    private cityPosition: {x:number, y:number};
    private city: City;

    constructor(city: City, cityPosition: {x:number, y:number}) {
        this.city = city;
        this.cityPosition = cityPosition;
    }

    init(go: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform): void {
        this.gameObject = go;
    }

    start(): void {
        // get scene object and create bar
        const {scene} = this.gameObject;

        this.createBorders();

        scene.add.text(this.cityPosition.x, 
            this.cityPosition.y, 
            this.city.cityName, 
            { font: this.font, fill: this.color })
            .setDepth(this.depth);
    }

    updateBorders() {
        // triggered updates
        if(!this.cityBorder) {
            return;
        }

        this.cityBorder.clear();
        this.createBorders();
    }

    private createBorders() {
        // get scene object and create bar
        const {scene} = this.gameObject;

        if(this.city != undefined && 
           this.city.cityBorders != undefined &&
           this.city.cityBorders.length > 0) {
            this.cityBorder = scene.add.graphics();
            this.cityBorder.depth = this.depth - 1;
            this.cityBorder.lineStyle(this.borderLineStrength, this.borderLineColor, this.borderLineAlpha);
            this.cityBorder.beginPath();
            //this.cityBorder.moveTo(this.city.cityBorders[0].start.x, this.city.cityBorders[0].start.y);
            for(let i = 0; i < this.city.cityBorders.length; i++) {
                this.cityBorder.moveTo(this.city.cityBorders[i].start.x, this.city.cityBorders[i].start.y);
                this.cityBorder.lineTo(this.city.cityBorders[i].end.x, this.city.cityBorders[i].end.y);
            }
            //this.cityBorder.closePath();
            this.cityBorder.strokePath();
        }
    }
}