import { Game as GameScene } from './scenes/game';
import { MainMenu as MainMenuScene } from './scenes/main_menu';
import { GameMenu as GameMenuScene } from './scenes/game_menu';
import { SettingsMenu as SettingsMenuScene } from './scenes/settings_menu';
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
        SettingsMenuScene,
        GameScene,
        GameMenuScene,
    ]
};

export default new Game(config);
