import { IComponent } from "../interfaces/IComponent";

export  default class CityUIComponent implements IComponent {
    private readonly font = '10px Courier';
    private readonly color = '#000000';
    private readonly depth = 1000;
    
    private gameObject: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
    
    private cityName: string;
    private cityPosition: {x:number, y:number};

    constructor(cityName: string, cityPosition: {x:number, y:number}) {
        this.cityName = cityName;
        this.cityPosition = cityPosition;
    }

    init(go: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform): void {
        this.gameObject = go;
    }

    start(): void {
        // get scene object and create bar
        const {scene} = this.gameObject;

        scene.add.text(this.cityPosition.x, 
            this.cityPosition.y, 
            this.cityName, 
            { font: this.font, fill: this.color })
            .setDepth(this.depth);
    }
}