var GameWrapper = function () {
    this.sound = false;
    this.controller = null;
    this.gameInstance = null;
    this._initGame();
};

function loadScript(url, callback) {
    if(Array.isArray(url)) {
        var it = { it:0 };
        url.forEach(function(element) {
            loadScript(element, function() {
                it.it++;
                if(url.length === it.it)
                    callback();
            });
        }, this);
        return;
    }
    // Adding the script tag to the head as suggested before
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    // script.src = window.location + url;
    script.src = url;

    // Then bind the event to the callback function.
    // There are several events for cross browser compatibility.
    script.onreadystatechange = callback;
    script.onload = callback;

    // Fire the loading
    head.appendChild(script);
}


GameWrapper.prototype = {
    _initGame: function () {
        controllerType = 'OneButton';
        controllerOpts = {};
        capabilities = [];

        // before your game calls gamee.gameInit, it must be able to accept mute and unmute command
        // but your game MUST NOT play any sound durring this phase
        gamee.emitter.addEventListener("mute", function (ev) {
            this.sound = false;
        }.bind(this));

        gamee.emitter.addEventListener("unmute", function (ev) {
            this.sound = true;
        }.bind(this));

        // calling init
        // in this phase, your game notifies platform what kind of controller it uses and what capabilities it has
        gamee.gameInit(controllerType, controllerOpts, capabilities, this._initGameCb.bind(this));
    },
    _initGameCb: function (data, cb) {
        // callback for gameInit
        // response for gameInit contains requested controller instance, some other data based on capabilities and sound otpion
        this.controller = data.controller;
        this.sound = data.sound;

        // now your game can setup assets and other stuff
        // durring this phase, gamee.loadingProgress(int) to notify platform about preparation progress
        // durring this phase, your game is allowed to play sound

		loadScript("crafty.js", this._gameReady.bind(this));
		
    },
	_loadResources : function() {
		// TODO: dont hardcode sizes here
        Crafty.sprite(640, 1136, "./Basketball/basketball-images/basketball-bg-2.png", {background : [0, 0]})
		Crafty.sprite(249, 249, "./Basketball/basketball-images/Asset18.png", {ball_sprite : [0, 0]})
		Crafty.sprite(317, 207, "./Basketball/basketball-images/Asset14.png", {board0 : [0, 0]})
		Crafty.sprite(133, 18, "./Basketball/basketball-images/Asset15.png", {ring : [0, 0]})
		Crafty.sprite(29, 29, "./Basketball/basketball-images/Asset16.png", {board1: [0, 0]})
		Crafty.sprite(118, 111, "./Basketball/basketball-images/Asset13.png", {net: [0, 0]})
	},
	_createCustomComponents : function() {
		Crafty.c("CircleCollision", {
			init : function() {
				this.radius = 10;
				this.collisionEnabled = false;
			},
			circleCollision : function(r, callback) {
				this.radius = r;
				this.circleCollisionCallback = callback
				this.collisionEnabled = true;
				return this;
			},
			events: {
				"Move": function(old_position) {
					if(this.w != old_position._w)
					{
						this.radius = this.radius / old_position._w * this.w;
					}
					
					if (!this.collisionEnabled) return;
					var entities = Crafty("CircleCollision").get()
					for (var i = 0, len = entities.length; i < len; i++) {
						if(entities[i] == this) continue;
				
						var that = entities[i];
						if (!that.collisionEnabled) continue;
						
						var vel = new Crafty.math.Vector2D(this.x - old_position._x, this.y - old_position._y);
						var vel_mag = vel.magnitude();
						vel.normalize();
						
						var that_c = { x : that.x + that.w * 0.5, y : that.y + that.h * 0.5}
						var this_c = { x : this.x + this.w * 0.5, y : this.y + this.h * 0.5}
						
						var diff = new Crafty.math.Vector2D(that_c.x - this_c.x, that_c.y - this_c.y);
						
						var D = vel.dotProduct(diff);
						if(D < 0) continue;
						var diff_mag = diff.magnitude();
						var F = diff_mag * diff_mag - D * D;
						var radius_sum = this.radius + that.radius;
						if(F >= radius_sum * radius_sum) continue;
						
						var T = radius_sum * radius_sum - F;
						if (T < 0) continue;
						var dist = D - Math.sqrt(T);
						if(vel_mag < dist) continue;
						
						vel.multiply(new Crafty.math.Vector2D(dist, dist));
						var op = new Crafty.math.Vector2D(old_position._x + this.w * 0.5, old_position._y + this.h * 0.5);
						op.add(vel);
						
						var N = new Crafty.math.Vector2D(op.x - that_c.x, op.y - that_c.y);
						N.normalize();
						var v = new Crafty.math.Vector2D(this.vx, this.vy);

						var t = -2 * N.dotProduct(v)
						N.multiply(new Crafty.math.Vector2D(t, t));
						v = v.add(N);

						var old_v = new Crafty.math.Vector2D(this.vx, this.vy);
						old_v.normalize();
						var v_dir = new Crafty.math.Vector2D(v.x, v.y);
						v_dir.normalize();
						var mult = -old_v.dotProduct(v_dir);
						mult = mult * mult * mult * 0.3 + 0.4; // elasticity
						v.multiply(new Crafty.math.Vector2D(mult, mult));
						if(v.magnitude() < 50)
						{
							v.normalize();
							v.multiply(new Crafty.math.Vector2D(50, 50));
						}
						
						if (this.circleCollisionCallback != null) 
						{
							this.circleCollisionCallback();
						}
						else if(that.circleCollisionCallback != null)
						{
							that.circleCollisionCallback();
						}
						else
						{
							this.vx = v.x;
							this.vy = v.y;
							var tmp = N.x;
							N.x = N.y;
							N.y = tmp;
							v.normalize();
							this.vrotation = -1 * v.dotProduct(N);
						}
					}
				},

			}
		});
	},
    _gameReady: function () {

		Crafty.init(640, 640, document.getElementsByTagName("BODY")[0]);
		Crafty.background('#FFFFFF');
		this._loadResources()
		this._createCustomComponents();
		
		// before you continue, you must be able to accept gameStart command
        gamee.emitter.addEventListener("start", this.gameStart.bind(this));

        // calling gamee.gameReady
        // this method will notify platform, your game is ready to accept gameStart command
        gamee.gameReady(this._gameReadyCb.bind(this));
    },
    _gameReadyCb: function () {
        // there you won't get any data
    },
    gameStart: function (ev) {
        if (this.gameInstance !== null) {
            this.gameInstance.forceEnd();
        }
        // when you start new game instance, you will probably want to pass some parameters based on:
        // type of game should run (is it first game? did player died already?)
        // call signature might differ a lot,
        // this is just sample how it could look like:
        this.gameInstance = new MyGame(this.sound, this.controller);
        // once game is ready, you must call callback
        // this is standart CustomEvent instance, callback is property of event.detail
        //this.tick = setTimeout(this._tick.bind(this), 17);
		ev.detail.callback();
    },
};


var MyGame = function (sound, controller) {
    this.pause = false;
    this.sound = false;
    this.controller = controller;
    this._init(sound);

    this.ballSpeed = 1200;
    this.ballZFactor = 15;
};

MyGame.prototype = {
    _init: function (sound) {
        this.sound = sound;

        // game must be able to listen to pause/unpause commands once it starts commands: 
        gamee.emitter.addEventListener("pause", function (ev) {
			Crafty.pause(true)
            this.pause = true;
        }.bind(this));
        gamee.emitter.addEventListener("resume", function (ev) {
			Crafty.pause(false)
            this.pause = false;
        }.bind(this));

        gamee.emitter.addEventListener("mute", function (ev) {
            this.sound = false;
        }.bind(this));

        gamee.emitter.addEventListener("unmute", function (ev) {
            this.sound = true;
        }.bind(this));

        this._initGameBehavior.call(this);
    },
    // in case game will be ended by command
    // this function might be handy to prevent memory leaking
    forceEnd: function () {
		Crafty("*").destroy();
    },
    // initalize game behavior here
    // this might differs a lot
	_score : 0,
    _initGameBehavior: function () {
        var bg = Crafty.e("2D, DOM, background, Mouse").attr({w: 360, h: 640});
		var game = this;
		bg.bind("MouseDown", this._mouseDown.bind(this))
		bg.bind("MouseUp", this._mouseUp.bind(this))
		Crafty.e("2D, DOM, board0").attr({x : 90, y : 130, z: 0, w: 180, h: 100});
		Crafty.e("2D, DOM, board1").attr({x : 172, y : 207, z : 1, w: 15, h: 15});
		this.score_counter = Crafty.e("2D, DOM, CircleCollision")
			.attr({x : 172, y : 217, z : 1, w: 15, h: 15})
			.circleCollision(10, function() { ++game._score; this.collisionEnabled = false; });
		Crafty.e("2D, DOM, net").attr({x : 150, y : 207, z : 100, w: 60, h: 50});
		this.ring = Crafty.e("2D, DOM, ring").attr({x : 145, y : 205, z: 100, w: 70, h: 11});
		Crafty.e("2D, DOM, Text")
			.text(function() { return "Score: " + game._score;})
			.dynamicTextGeneration(true)
			.textFont({ size: '20px', weight: 'bold' });
		
		this._createPlayer();
		
		Crafty.e("CircleCollision, DOM, 2D")
			.attr({w: 10, h: 10})
			.attr({x: 145, y: 205})
			.circleCollision(5);
		Crafty.e("CircleCollision, DOM, 2D")
			.attr({w: 10, h: 10})
			.attr({x: 205, y: 205})
			.circleCollision(5);

		//this._tick();
    },
	_createPlayer : function()
	{
		var game = this
		if(this.player) { this.player.destroy(); }
		this.player = Crafty.e('2D, DOM, ball_sprite, Gravity, CircleCollision, AngularMotion')
		.attr({w: 75, h: 75})
		.origin("center")
		.attr({x: 155, y: 540, z : 101})
		.gravityConst(1400)
		.circleCollision(25)
		.bind('EnterFrame', function(data){
			var ring = Crafty("ring").get(0)
			if(this.y + this.h + 50 < ring.y)
			{
				this.collisionEnabled = true;
				this.z = game.ring.z - 1;
			}
			if(this.started)
			{
				if(this.w > 30)
				{	
					this.w -= data.dt * game.ballZFactor / 1000;
					this.h -= data.dt * game.ballZFactor / 1000;
				}
				else
				{
					this.w = 30;
					this.h = 30;
				}
				this.origin("center")
			}
			
			if(this.y > 550) game._createPlayer();
		})
		this.player.collisionEnabled = false
		this.player.started = false
	},
	_lastMouseDownEvent : null,
	_mouseDown : function(ev) {
		_lastMouseDownEvent = ev;
	},
	_mouseUp : function(ev) {
		var dx = ev.realX - _lastMouseDownEvent.realX;
		var dy = ev.realY - _lastMouseDownEvent.realY;
		
		var v = new Crafty.math.Vector2D(dx, dy);
		v.normalize();
		v.multiply(new Crafty.math.Vector2D(this.ballSpeed, this.ballSpeed));
		this.player.vx = v.x;
		this.player.vy = v.y;
		this.player.gravity();
		this.player.started = true;
		this.score_counter.collisionEnabled = true;
	}
    // game tick function
    // many games contain one or more functions repeating some kind of process (rendering)
    // in that part, your game might validate if game is paused and state of sound
    //_tick: function () {
    //    this.tick = setTimeout(this._tick.bind(this), 17);
    //},
};

setTimeout(function () {
    var gameWrapper = new GameWrapper();
}, 0);