﻿//=============================================================================
// TMVplugin - お金でレベルアップ
// 作者: tomoaky (http://hikimoki.sakura.ne.jp/)
// Version: 1.11
// 最終更新日: 2016/01/26
//=============================================================================

/*:
 * @plugindesc 経験値ではなくお金を消費して任意のタイミングで
 * アクターをレベルアップさせることができます。
 *
 * @author tomoaky (http://hikimoki.sakura.ne.jp/)
 *
 * @param levelUpCommand
 * @desc メニューに表示するレベルアップコマンド（空にすれば無効）
 * 初期値: レベルアップ
 * @default レベルアップ
 *
 * @param currentGold
 * @desc ステータスに表示するお金の項目名
 * 初期値: 所持金
 * @default 所持金
 *
 * @param learnSkill
 * @desc ステータスに表示する覚えるスキルの項目名
 * 初期値: 覚えるスキル
 * @default 覚えるスキル
 *
 * @param levelUpSe
 * @desc レベルアップ時に鳴らす効果音（ファイル名 音量 ピッチ パン）
 * 初期値: Up4 90 100 0
 * @default Up4 90 100 0
 *
 * @param useButton
 * @desc アクター変更のボタンを表示するかどうか
 * 初期値: 1（ 0 で表示しない）
 * @default 1
 *
 * @help
 * lavelUpCommand のコマンド名を削除して空にすれば
 * メニューからレベルアップコマンドを削除することができます。
 * この場合はプラグインコマンドを使ってイベントからレベルアップシーンを
 * 呼び出してください。
 *
 * プラグインコマンド:
 *   callLevelUp        # レベルアップシーンを呼び出す
 * 
 */

var Imported = Imported || {};
Imported.TMGoldLevelUp = true;

var TMParam = TMParam || {};

(function() {

  var parameters = PluginManager.parameters('TMGoldLevelUp');
  var levelUpCommand = parameters['levelUpCommand'];
  var currentGold = parameters['currentGold'];
  var learnSkill  = parameters['learnSkill'];
  var a = parameters['levelUpSe'].split(' ');
  var levelUpSe = {};
  levelUpSe.name   = a[0];
  levelUpSe.volume = Number(a[1]);
  levelUpSe.pitch  = Number(a[2]);
  levelUpSe.pan    = Number(a[3]);
  var useButton = parameters['useButton'] === '1' ? true : false;
  
  //-----------------------------------------------------------------------------
  // TextManager
  //

  Object.defineProperty(TextManager, 'goldLevelUp', {
    get: function() { return levelUpCommand; },
    configurable: true
  });

  //-----------------------------------------------------------------------------
  // Game_Interpreter
  //

  var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    if (command === 'callLevelUp') {
      SceneManager.push(Scene_GoldLevelUp);
    }
  };
  
  //-----------------------------------------------------------------------------
  // Window_MenuCommand
  //

  var _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
  Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    if (levelUpCommand) {
      this.addCommand(levelUpCommand, 'levelUp', true);
    }
  };

  //-----------------------------------------------------------------------------
  // Window_Status
  //
  
  Window_Status.prototype.drawExpInfo = function(x, y) {
    var lineHeight = this.lineHeight();
    var expNext = TextManager.expNext.format(TextManager.level);
    var value = this._actor.nextRequiredExp();
    if (this._actor.isMaxLevel()) {
      value = '-------';
    }
    this.changeTextColor(this.systemColor());
    this.drawText(expNext, x, y + lineHeight * 0, 270);
    this.drawText(currentGold, x, y + lineHeight * 2, 270);
    this.resetTextColor();
    this.drawCurrencyValue(value, TextManager.currencyUnit,
                           x, y + lineHeight * 1, 270);
    this.drawCurrencyValue($gameParty.gold(), TextManager.currencyUnit,
                           x, y + lineHeight * 3, 270);
  };

  //-----------------------------------------------------------------------------
  // Window_GoldLevelUpCommand
  //

  function Window_GoldLevelUpCommand() {
    this.initialize.apply(this, arguments);
  }

  Window_GoldLevelUpCommand.prototype = Object.create(Window_HorzCommand.prototype);
  Window_GoldLevelUpCommand.prototype.constructor = Window_GoldLevelUpCommand;

  Window_GoldLevelUpCommand.prototype.initialize = function() {
    Window_HorzCommand.prototype.initialize.call(this, 0, 0);
  };

  Window_GoldLevelUpCommand.prototype.windowWidth = function() {
    return Graphics.boxWidth;
  };

  Window_GoldLevelUpCommand.prototype.maxCols = function() {
    return 2;
  };

  Window_GoldLevelUpCommand.prototype.makeCommandList = function() {
    this.addCommand('レベルアップ', 'levelUp', this.canLevelUp());
    this.addCommand('キャンセル',   'cancelCommand');
  };
  
  Window_GoldLevelUpCommand.prototype.canLevelUp = function() {
    return this._actor && !this._actor.isMaxLevel() &&
           $gameParty.gold() >= this._actor.nextRequiredExp();
  };
  
  Window_GoldLevelUpCommand.prototype.setActor = function(actor) {
    this._actor = actor;
    this.refresh();
  };

  Window_GoldLevelUpCommand.prototype.playOkSound = function() {
    if (this.currentSymbol() === 'levelUp') {
      AudioManager.playSe(levelUpSe);     // レベルアップ効果音を鳴らす
    } else {
      SoundManager.playOk();
    }
  };
  
  //-----------------------------------------------------------------------------
  // Window_GoldLevelUpStatus
  //

  function Window_GoldLevelUpStatus() {
    this.initialize.apply(this, arguments);
  }

  Window_GoldLevelUpStatus.prototype = Object.create(Window_Selectable.prototype);
  Window_GoldLevelUpStatus.prototype.constructor = Window_GoldLevelUpStatus;

  Window_GoldLevelUpStatus.prototype.initialize = function(x, y, width, height) {
    Window_Selectable.prototype.initialize.call(this, x, y, width, height);
    this.refresh();
  };

  Window_GoldLevelUpStatus.prototype.setActor = function(actor) {
    if (this._actor !== actor) {
      this._actor = actor;
      this.refresh();
    }
  };

  Window_GoldLevelUpStatus.prototype.refresh = function() {
    this.contents.clear();
    if (this._actor) {
      if (!this._actor.isMaxLevel()) {
        this._tempActor = JsonEx.makeDeepCopy(this._actor);
        this._tempActor.levelUp();
      } else {
        this._tempActor = null;
      }
      var lineHeight = this.lineHeight();
      this.drawBlock1(lineHeight * 0);
      this.drawHorzLine(lineHeight * 1);
      this.drawBlock2(lineHeight * 2 - 20);
      this.drawHorzLine(lineHeight * 6 - 20);
      this.drawBlock3(lineHeight * 7 - 40);
    }
  };

  Window_GoldLevelUpStatus.prototype.drawBlock1 = function(y) {
    this.drawActorName(this._actor, 6, y);
    this.drawActorClass(this._actor, 192, y);
    this.drawActorNickname(this._actor, 432, y);
  };

  Window_GoldLevelUpStatus.prototype.drawBlock2 = function(y) {
    this.drawActorFace(this._actor, 12, y);
    if (useButton && $gameParty.size() > 1) {
      this.drawButton(140, y);
    }
    this.drawBasicInfo(204, y);
    this.drawExpInfo(456, y);
  };

  Window_GoldLevelUpStatus.prototype.drawButton = function(x, y) {
    var bitmap = ImageManager.loadSystem('ButtonSet');
    this.contents.blt(bitmap, 96, 0, 48, 48, x, y);
    this.contents.blt(bitmap, 48, 0, 48, 48, x, y + 96);
  };

  Window_GoldLevelUpStatus.prototype.drawBlock3 = function(y) {
    this.drawParameters(48, y);
    this.drawSkills(432, y);
  };

  Window_GoldLevelUpStatus.prototype.drawHorzLine = function(y) {
    var lineY = y + 7;
    this.contents.paintOpacity = 48;
    this.contents.fillRect(0, lineY, this.contentsWidth(), 2, this.lineColor());
    this.contents.paintOpacity = 255;
  };

  Window_GoldLevelUpStatus.prototype.lineColor = function() {
    return this.normalColor();
  };

  Window_GoldLevelUpStatus.prototype.drawBasicInfo = function(x, y) {
    var lineHeight = this.lineHeight();
    this.drawActorLevel(this._actor, x, y + lineHeight * 0);
    this.drawActorIcons(this._actor, x, y + lineHeight * 1);
    this.drawActorHp(this._actor, x, y + lineHeight * 2);
    this.drawActorMp(this._actor, x, y + lineHeight * 3);
  };

  Window_GoldLevelUpStatus.prototype.drawParameters = function(x, y) {
    var lineHeight = this.lineHeight();
    for (var i = 0; i < 8; i++) {
      var y2 = y + lineHeight * i;
      this.changeTextColor(this.systemColor());
      this.drawText(TextManager.param(i), x, y2, 120);
      this.resetTextColor();
      this.drawText(this._actor.param(i), x + 140, y2, 48, 'right');
      if (this._tempActor) {
        this.drawRightArrow(x + 188, y2);
        this.drawNewParam(x + 222, y2, i);
      }
    }
  };

  Window_GoldLevelUpStatus.prototype.drawRightArrow = function(x, y) {
    this.changeTextColor(this.systemColor());
    this.drawText('\u2192', x, y, 32, 'center');
  };

  Window_GoldLevelUpStatus.prototype.drawNewParam = function(x, y, paramId) {
    var newValue = this._tempActor.param(paramId);
    var diffvalue = newValue - this._actor.param(paramId);
    this.changeTextColor(this.paramchangeTextColor(diffvalue));
    this.drawText(newValue, x, y, 48, 'right');
  };

  Window_GoldLevelUpStatus.prototype.drawExpInfo = function(x, y) {
    var lineHeight = this.lineHeight();
    var expNext = TextManager.expNext.format(TextManager.level);
    var value = this._actor.nextRequiredExp();
    if (this._actor.isMaxLevel()) {
      value = '-------';
    }
    this.changeTextColor(this.systemColor());
    this.drawText(expNext, x, y + lineHeight * 0, 270);
    this.drawText(currentGold, x, y + lineHeight * 2, 270);
    this.resetTextColor();
    this.drawCurrencyValue(value, TextManager.currencyUnit,
                           x, y + lineHeight * 1, 270);
    this.drawCurrencyValue($gameParty.gold(), TextManager.currencyUnit,
                           x, y + lineHeight * 3, 270);
  };

  Window_GoldLevelUpStatus.prototype.drawSkills = function(x, y) {
    var lineHeight = this.lineHeight();
    this.changeTextColor(this.systemColor());
    this.drawText(learnSkill, x, y + lineHeight * 0, 270);
    this.resetTextColor();
    if (this._tempActor) {
      var i = 0;
      this._tempActor.currentClass().learnings.forEach(function(learning) {
        if (learning.level === this._tempActor._level) {
          i++;
          var skill = $dataSkills[learning.skillId];
          this.drawItemName(skill, x, y + lineHeight * i);
        }
      }, this);
    }
  };
  
  Window_GoldLevelUpStatus.prototype.isHitUpButton = function() {
    var x = this.parent.x + this.x + this.standardPadding() + 140;
    var y = this.parent.y + this.y + this.standardPadding() + this.lineHeight() * 2 - 20;
    return TouchInput.x >= x && TouchInput.x < x + 48 &&
           TouchInput.y >= y && TouchInput.y < y + 48;
  };

  Window_GoldLevelUpStatus.prototype.isHitDownButton = function() {
    var x = this.parent.x + this.x + this.standardPadding() + 140;
    var y = this.parent.y + this.y + this.standardPadding() + this.lineHeight() * 2 + 76;
    return TouchInput.x >= x && TouchInput.x < x + 48 &&
           TouchInput.y >= y && TouchInput.y < y + 48;
  };

  //-----------------------------------------------------------------------------
  // Scene_Menu
  //

  var _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
  Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler('levelUp', this.commandPersonal.bind(this));
  };

  var _Scene_Menu_onPersonalOk = Scene_Menu.prototype.onPersonalOk;
  Scene_Menu.prototype.onPersonalOk = function() {
    switch (this._commandWindow.currentSymbol()) {
    case 'levelUp':
        SceneManager.push(Scene_GoldLevelUp);
        break;
    default:
      _Scene_Menu_onPersonalOk.call(this);
      break;
    }
  };

  //-----------------------------------------------------------------------------
  // Scene_GoldLevelUp
  //

  function Scene_GoldLevelUp() {
      this.initialize.apply(this, arguments);
  }
  
  Scene_GoldLevelUp.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_GoldLevelUp.prototype.constructor = Scene_GoldLevelUp;

  Scene_GoldLevelUp.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
  };

  Scene_GoldLevelUp.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createCommandWindow();
    this.createStatusWindow();
  };

  Scene_GoldLevelUp.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    this._statusWindow.refresh();
  };

  Scene_GoldLevelUp.prototype.createCommandWindow = function() {
    this._commandWindow = new Window_GoldLevelUpCommand();
    this._commandWindow.setHandler('levelUp',       this.commandLevelUp.bind(this));
    this._commandWindow.setHandler('cancelCommand', this.popScene.bind(this));
    this._commandWindow.setHandler('pagedown',      this.nextActor.bind(this));
    this._commandWindow.setHandler('pageup',        this.previousActor.bind(this));
    this._commandWindow.setHandler('cancel',        this.popScene.bind(this));
    this.addWindow(this._commandWindow);
  };

  Scene_GoldLevelUp.prototype.createStatusWindow = function() {
    var wy = this._commandWindow.height;
    var ww = Graphics.boxWidth;
    var wh = Graphics.boxHeight - this._commandWindow.height;
    this._statusWindow = new Window_GoldLevelUpStatus(0, wy, ww, wh);
    this.addWindow(this._statusWindow);
    this.refreshActor();
  };

  Scene_GoldLevelUp.prototype.commandLevelUp = function() {
    var actor = this.actor();
    $gameParty.loseGold(actor.nextRequiredExp());
    actor.changeExp(actor.currentExp() + actor.nextRequiredExp(), false);
    this._commandWindow.refresh();
    this._statusWindow.refresh();
//    this._commandWindow.deselect();
    this._commandWindow.activate();
  };

  Scene_GoldLevelUp.prototype.refreshActor = function() {
    var actor = this.actor();
    this._commandWindow.setActor(actor);
    this._statusWindow.setActor(actor);
  };

  Scene_GoldLevelUp.prototype.onActorChange = function() {
    this.refreshActor();
    this._commandWindow.activate();
  };

  Scene_GoldLevelUp.prototype.update = function() {
    Scene_MenuBase.prototype.update.call(this);
    if (useButton && $gameParty.size() > 1 && TouchInput.isTriggered()) {
      if (this._statusWindow.isHitUpButton()) {
        this.previousActor();
        SoundManager.playCursor();
      } else if (this._statusWindow.isHitDownButton()) {
        this.nextActor();
        SoundManager.playCursor();
      }
    }
  };
  
  TMParam.Scene_GoldLevelUp = Scene_GoldLevelUp;

})();
