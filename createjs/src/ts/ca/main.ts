'use strict';
document['frima']['framerate'] = 60;
document['frima']['multi'] = true;

import core    = require('core');
import util    = require('util');

declare function l(key: string): string;
declare function resize(): void;
declare var noise:any;

export function start() {
    core.start();

    var screen = new GameScreen();
    resize();
}


export class Player {
    private collideableList:any[] = null;
    private collision:any = null;
    private onGround:boolean = false;
    private game:any = null;

    public sprite:createjs.Sprite = null;
    public velocity:any = {x:0, y:25};

    constructor(game) {
        this.game = game;
        this.sprite = core.getSprite('player');
        this.collideableList = game.collideableList;
        createjs.Ticker.addEventListener("tick", this.tick.bind(this));
    }

    private calculateIntersection(rect1, rect2, x, y)
    {
        // prevent x|y from being null||undefined
        x = x || 0; y = y || 0;

        // first we have to calculate the
        // center of each rectangle and half of
        // width and height
        var dx, dy, r1={}, r2={};

        r1['cx'] = rect1.x+x+(r1['hw'] = (rect1.width /2));
        r1['cy'] = rect1.y+y+(r1['hh'] = (rect1.height/2));
        r2['cx'] = rect2.x + (r2['hw'] = (rect2.width /2));
        r2['cy'] = rect2.y + (r2['hh'] = (rect2.height/2));

        dx = Math.abs(r1['cx']-r2['cx']) - (r1['hw'] + r2['hw']);
        dy = Math.abs(r1['cy']-r2['cy']) - (r1['hh'] + r2['hh']);

        if (dx < 0 && dy < 0) {
            return {width:-dx,height:-dy};
        } else {
            return null;
        }
    }

    public tick() {
        this.game.layer.x = -this.sprite.x + (core.getStage().canvas.width/2);
        this.game.layer.y = -this.sprite.y + (core.getStage().canvas.height/2);

        this.velocity.y += 1;

        var addY = this.velocity.y;
        var bounds = {x:this.sprite.x, y:this.sprite.y, width:48, height:48};
        var counter = 0;

        var collideableBounds

        while ( !this.collision && counter < this.collideableList.length ) {
            var collideable = this.collideableList[counter]
            collideableBounds = {x:collideable.x, y:collideable.y, width:48, height:48};
            if ( this.collideableList[counter].isVisible ) {
                this.collision = this.calculateIntersection(bounds, collideableBounds, 0, addY);
            }

            if ( !this.collision && this.collideableList[counter].isVisible ) {
                if ( ( bounds.y < collideableBounds.y && bounds.y + addY > collideableBounds.y )
                    || ( bounds.y > collideableBounds.y && bounds.y + addY < collideableBounds.y ) ) {
                    addY = collideableBounds.y - bounds.y;
                } else {
                    counter++;
                }
            }
        }

        if ( !this.collision ) {
            this.sprite.y += addY;
            if ( this.onGround ) {
                this.onGround = false;
            }
        } else {
            this.sprite.y += addY - this.collision.height;
            if ( addY > 0 ) {
                this.onGround = true;
            }
            this.velocity.y = 0;
        }
        this.sprite.x += this.velocity.x;
        this.collision = null;
    }

    public jump() {
        if ( this.onGround ) {
            this.velocity.y = -17;
            this.onGround = false;
        }
    }
}

export class GameScreen extends core.Screen {
    private collideableList:any[] = [];
    private player:any = null;

    public layer: createjs.Container = null;

    constructor() {
        super([]);
        this.preload();

        var scope = this;
    }

    public preload() {

        var scope = this;
        var manifest = core.assetManifest(
            {
                baseUrl: '../assets',
                sprites: ['0']
            }
        );
        core.preloadAssets(manifest, function() {
                scope.init();
            }
        );
    }

    private keyDown(e) {
        if(e.keyCode == 32) {
            this.player.jump();
        } else if(e.keyCode == 65) {
            this.player.velocity.x = -15;
        } else if(e.keyCode == 68) {
            this.player.velocity.x = 15;
        }
    }

    private keyUp(e) {
        if (e.keyCode == 65 || e.keyCode == 68) {
            this.player.velocity.x = 0;
        }
    }

    public init() {
        super.init();

        console.log('init scene');

        if (util.os() != 'iOS') {
            core.playMusic('music');
        }

        var time: number  = 500;

        document.onkeydown = this.keyDown.bind(this);
        document.onkeyup = this.keyUp.bind(this);

        this.layer = new createjs.Container();
        this.player = new Player(this);
        this.loadLevel();
        this.layer.addChild(this.player.sprite);
        this.addChild(this.layer);
    }

    private loadLevel() {
        var collision = [];
        var levelSize = {'x':60, 'y':40};
        for(var i = 0; i < levelSize.y; i++) {
            var inside = [];
            for(var j = 0; j < levelSize.x; j++) {
                inside.push(0);
            }
            collision[i] = inside;
        }
        var data = _.clone(collision, true);

        offset = Math.floor((Math.random() * 10000));
        scale = 20;
        for(var x = 0; x < levelSize.x; x++) {
            var value = noise.perlin3((x+offset) / scale, (x+offset) / scale, 0);
            value = (1 + value) * 1.1 * 10;
            var y = Math.ceil(value);
            collision[y][x] = 1;
            data[y][x] = 1;

            for(var c = y+1; c < collision.length; c++) {
                collision[c][x] = 1;
                data[c][x] = 2;
            }

        }

        var offset = 0;
        var scale = 5;
        var floodFill = function(cave, limits, x, y) {
            var key = x + ':' + y;
            var value = noise.perlin2((x+offset) / scale, (y+offset) / scale);
            value = Math.floor(value * 256);

            limits.maximum.x = Math.max(limits.maximum.x, x);
            limits.maximum.y = Math.max(limits.maximum.y, y);
            limits.minimum.x = Math.min(limits.minimum.x, x);
            limits.minimum.y = Math.min(limits.minimum.y, y);

            if(_.contains(cave, key)) {
                return;
            }
            if(value <= 0) {
                return;
            }
            cave.push(key);
            floodFill(cave, limits, x-1, y);
            floodFill(cave, limits, x+1, y);
            floodFill(cave, limits, x, y-1);
            floodFill(cave, limits, x, y+1);
            return;
        }

        var caveList = [];
        var limitList = [];
        var generateCaves = function() {
            var cave = [];
            var limits = {'minimum': {'x':Infinity, 'y':Infinity}, 'maximum': {'x': -Infinity, 'y': -Infinity}};
            floodFill(cave, limits, Math.floor((Math.random() * 100)), Math.floor((Math.random() * 100)));
            if(cave.length > 0) {
                caveList.push(cave);
                limitList.push(limits);
            }
        }
        for(var i = 0; i < 20; i++) {
            generateCaves();
        }

        if(caveList.length > 0) {
            var firstBlock = Number(caveList[0][0].split(':')[1]);
            for(var c = 0; c < caveList[0].length; c++) {
                // Creating caves from the list.
                var key = caveList[0][c].split(':');
                key[0] = Number(key[0]-limitList[0].minimum.x);
                key[1] = Math.min(Math.max(Number(key[1]-limitList[0].minimum.y), 0), levelSize.y-1);
                collision[key[1]][key[0]] = 0;
                if(data[key[1]][key[0]]) {
                    data[key[1]][key[0]] = 3;
                }
            }
        }

        for(var i = 0; i < data.length; i++) {
            for(var j = 0; j < data[i].length; j++) {
                if(data[i][j] == 1) {
                    var sprite = core.getSprite('green_cube');
                    sprite.x = j*48;
                    sprite.y = i*48;
                    this.collideableList.push(sprite);
                    this.layer.addChild(sprite);
                }
                else if(data[i][j] == 2) {
                    var checkSurrounding = function() {
                        if(i == 0 || j == 0 || i >= data.length-1 || j >= data[i].length-1 || data[i-1][j] == 0 || data[i][j-1] == 0 || data[i+1][j] == 0 || data[i][j+1] == 0
                            || data[i-1][j] == 3 || data[i][j-1] == 3 || data[i+1][j] == 3 || data[i][j+1] == 3
                        ) {
                            return 'empty';
                        } else {
                            return 'block';
                        }
                    };
                    if(checkSurrounding() == 'empty') {
                        var sprite = core.getSprite('dirt_cube');
                        sprite.x = j*48;
                        sprite.y = i*48;
                        this.collideableList.push(sprite);
                        this.layer.addChild(sprite);
                    }
                    else {
                        var sprite = core.getSprite('dirt_cube');
                        sprite.x = j*48;
                        sprite.y = i*48;
                        this.collideableList.push(sprite);
                        this.layer.addChild(sprite);
                    }
                }
                else if(data[i][j] == 3) {
                    var sprite = core.getSprite('background_cube');
                    sprite.x = j*48;
                    sprite.y = i*48;
                    this.layer.addChild(sprite);
                }
            }
        }
    }

    dispose() {
        super.dispose();
    }
}