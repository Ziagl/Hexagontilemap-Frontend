import { Game as GameScene } from './scenes/game';
import { MainMenu as MainMenuScene } from './scenes/main_menu';
import { GameMenu as GameMenuScene } from './scenes/game_menu';
import { SettingsMenu as SettingsMenuScene } from './scenes/settings_menu';
import { AUTO, Game, Scale, Types } from 'phaser';
import { GameData } from './models/game_data';
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

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
    createContainer: true,
  },
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [MainMenuScene, SettingsMenuScene, GameScene, GameMenuScene],
  plugins: {
    scene: [{ key: 'rexUI', plugin: RexUIPlugin, mapping: 'rexUI' }],
    global: [
      //make the Player global to all scenes (and other plugins)
      // key is plugin key, plugin is class, start true/false if there
      // is a start method to run, mapping is the name tagged of this
      // to access the plugin class
      { key: 'gameData', plugin: GameData, start: false, mapping: 'gameData' },
    ],
  },
};

export default new Game(config);
