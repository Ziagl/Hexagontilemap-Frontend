import { MainMenu as MainMenuScene } from './scenes/MainMenu';
import { Game as GameScene } from './scenes/Game';
import { GameMenu as GameMenuScene } from './scenes/GameMenu';
import { AUTO, Game, Scale,Types } from "phaser";

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#028af8',
    //pixelArt: true,
    dom: {
        createContainer: true
    },
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        MainMenuScene,
        GameScene,
        GameMenuScene
    ]
};

export default new Game(config);
