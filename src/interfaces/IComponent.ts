export interface IComponent {
    init(go: Phaser.GameObjects.GameObject): void;

    awake?: () => void;
    start?: () => void;
    update?: (dt: number) => void;

    destroy?: () => void;
};