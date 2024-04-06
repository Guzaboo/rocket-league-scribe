var W3CWebSocket = require('websocket').w3cwebsocket;

const WsSubscribers = {
    __subscribers: {},
    websocket: undefined,
    webSocketConnected: false,
    registerQueue: [],
    init: function (port, debug, debugFilters) {
        port = port || 49322;
        debug = debug || false;
        if (debug) {
            if (debugFilters !== undefined) {
                console.warn("WebSocket Debug Mode enabled with filtering. Only events not in the filter list will be dumped");
            } else {
                console.warn("WebSocket Debug Mode enabled without filters applied. All events will be dumped to console");
                console.warn("To use filters, pass in an array of 'channel:event' strings to the second parameter of the init function");
            }
        }

        WsSubscribers.webSocket = new W3CWebSocket("ws://localhost:" + port, 'echo-protocol');

        WsSubscribers.webSocket.onmessage = function (event) {
            let jEvent = JSON.parse(event.data);
            if (!jEvent.hasOwnProperty('event')) {
                return;
            }
            let eventSplit = jEvent.event.split(':');
            let channel = eventSplit[0];
            let event_event = eventSplit[1];
            if (debug) {
                if (!debugFilters) {
                    console.log(channel, event_event, jEvent);
                } else if (debugFilters && debugFilters.indexOf(jEvent.event) < 0) {
                    console.log(channel, event_event, jEvent);
                }
            }
            WsSubscribers.triggerSubscribers(channel, event_event, jEvent.data);
        };
        WsSubscribers.webSocket.onopen = function () {
            WsSubscribers.triggerSubscribers("ws", "open");
            WsSubscribers.webSocketConnected = true;
            WsSubscribers.registerQueue.forEach((r) => {
                WsSubscribers.send("wsRelay", "register", r);
            });
            WsSubscribers.registerQueue = [];
        };
        WsSubscribers.webSocket.onerror = function () {
            WsSubscribers.triggerSubscribers("ws", "error");
            WsSubscribers.webSocketConnected = false;
        };
        WsSubscribers.webSocket.onclose = function () {
            WsSubscribers.triggerSubscribers("ws", "close");
            WsSubscribers.webSocketConnected = false;
        };
    },
    /**
     * Add callbacks for when certain events are thrown
     * Execution is guaranteed to be in First In First Out order
     * @param channels
     * @param events
     * @param callback
     */
    subscribe: function (channels, events, callback) {
        if (typeof channels === "string") {
            let channel = channels;
            channels = [];
            channels.push(channel);
        }
        if (typeof events === "string") {
            let event = events;
            events = [];
            events.push(event);
        }
        channels.forEach(function (c) {
            events.forEach(function (e) {
                if (!WsSubscribers.__subscribers.hasOwnProperty(c)) {
                    WsSubscribers.__subscribers[c] = {};
                }
                if (!WsSubscribers.__subscribers[c].hasOwnProperty(e)) {
                    WsSubscribers.__subscribers[c][e] = [];
                    if (WsSubscribers.webSocketConnected) {
                        WsSubscribers.send("wsRelay", "register", `${c}:${e}`);
                    } else {
                        WsSubscribers.registerQueue.push(`${c}:${e}`);
                    }
                }
                WsSubscribers.__subscribers[c][e].push(callback);
            });
        })
    },
    clearEventCallbacks: function (channel, event) {
        if (WsSubscribers.__subscribers.hasOwnProperty(channel) && WsSubscribers.__subscribers[channel].hasOwnProperty(event)) {
            WsSubscribers.__subscribers[channel] = {};
        }
    },
    triggerSubscribers: function (channel, event, data) {
        if (WsSubscribers.__subscribers.hasOwnProperty(channel) && WsSubscribers.__subscribers[channel].hasOwnProperty(event)) {
            WsSubscribers.__subscribers[channel][event].forEach(function (callback) {
                if (callback instanceof Function) {
                    callback(data);
                }
            });
        }
    },
    send: function (channel, event, data) {
        if (typeof channel !== 'string') {
            console.error("Channel must be a string");
            return;
        }
        if (typeof event !== 'string') {
            console.error("Event must be a string");
            return;
        }
        if (channel === 'local') {
            this.triggerSubscribers(channel, event, data);
        } else {
            let cEvent = channel + ":" + event;
            WsSubscribers.webSocket.send(JSON.stringify({
                'event': cEvent,
                'data': data
            }));
        }
    }
};

const LOGGING_LEVEL = 5;

const GAME_LENGTH = 300.0;
const UNINITIALIZED_PLAYER_NAME = "__uninitialized";

const MAX_X = 4096; // Measured in CM
const MAX_Y = 5120; // Measured in CM
const MAX_Z = 2044; // Measured in CM
const MAX_PITCH = 32767 / 2; // Measured in 16-bit integers with 32767 = pi
const MAX_ROLL = 32767; // Measured in 16-bit integers with 32767 = pi
const MAX_YAW = 32767; // Measured in 16-bit integers with 32767 = pi
const MAX_CAR_SPEED = 2300 * 0.036; // Measured in KPH
const MAX_BALL_SPEED = 6000 * 0.036;
const MAX_BOOST = 100;

function getDefaultBall() {
    return JSON.parse(JSON.stringify({
        location: {
            x: 0,
            y: 0,
            z: 0,
        },
        speed: 0,
    }));
}

function getDefaultPlayer() {
    return JSON.parse(JSON.stringify({
        name: UNINITIALIZED_PLAYER_NAME,
        assists: 0,
        boost: 0,
        cartouches: 0,
        demos: 0,
        goals: 0,
        location: {
            x: 0,
            y: 0,
            z: 0,
            pitch: 0,
            roll: 0,
            yaw: 0,
        },
        saves: 0,
        score: 0,
        shots: 0,
        speed: 0,
        touches: 0,
    }));
}

function getDefaults() {
    return JSON.parse(JSON.stringify({
        timeLeft: GAME_LENGTH,
        timePassed: 0,
        ball: getDefaultBall(),
        team1: {
            score: 0,
            players: [
                getDefaultPlayer(),
                getDefaultPlayer(),
                getDefaultPlayer(),
            ],
        },
        team2: {
            score: 0,
            players: [
                getDefaultPlayer(),
                getDefaultPlayer(),
                getDefaultPlayer(),
            ],
        },
        invalidated: false,
    }));
}

let cachedGameData = getDefaults();
let timeStep = 0;
let gameInProgress = false;

function logPlayer(tabs, player) {
    console.log(`${tabs}{`);
    console.log(`${tabs}    name: ${player.name},`);
    console.log(`${tabs}    assists: ${player.assists},`);
    console.log(`${tabs}    boost: ${player.boost},`);
    console.log(`${tabs}    cartouches: ${player.cartouches},`);
    console.log(`${tabs}    demos: ${player.demos},`);
    console.log(`${tabs}    goals: ${player.goals},`);
    console.log(`${tabs}    location: {`);
    console.log(`${tabs}        x: ${player.location.x},`);
    console.log(`${tabs}        y: ${player.location.y},`);
    console.log(`${tabs}        z: ${player.location.z},`);
    console.log(`${tabs}        pitch: ${player.location.pitch},`);
    console.log(`${tabs}        roll: ${player.location.roll},`);
    console.log(`${tabs}        yaw: ${player.location.yaw},`);
    console.log(`${tabs}    },`);
    console.log(`${tabs}    saves: ${player.saves},`);
    console.log(`${tabs}    score: ${player.score},`);
    console.log(`${tabs}    shots: ${player.shots},`);
    console.log(`${tabs}    speed: ${player.speed},`);
    console.log(`${tabs}    touches: ${player.touches},`);
    console.log(`${tabs}}`);
}

function logData(scoreUpdated) {
    if (LOGGING_LEVEL < 5) return;
    console.log();
    if (5 <= LOGGING_LEVEL) {
        if (cachedGameData.invalidated) {
            console.log(`DATA INVALIDATED!`);
            return;
        }
        console.log(`Saved data. (${scoreUpdated ? `goal scored` : `timePassed: ${cachedGameData.timePassed}`})`);
    }
    if (LOGGING_LEVEL < 10 && timeStep !== 0) return;
    console.log(`{`);
    console.log(`    timeLeft: ${cachedGameData.timeLeft},`);
    console.log(`    timePassed: ${cachedGameData.timePassed},`);
    console.log(`    ball: {`);
    console.log(`        location: {`);
    console.log(`            x: ${cachedGameData.ball.location.x},`);
    console.log(`            y: ${cachedGameData.ball.location.y},`);
    console.log(`            z: ${cachedGameData.ball.location.z},`);
    console.log(`        },`);
    console.log(`        speed: ${cachedGameData.ball.speed},`);
    console.log(`    },`);
    console.log(`    team1: {`);
    console.log(`        score: ${cachedGameData.team1.score},`);
    console.log(`        players: [`);
    logPlayer("            ", cachedGameData.team1.players[0]);
    logPlayer("            ", cachedGameData.team1.players[1]);
    logPlayer("            ", cachedGameData.team1.players[2]);
    console.log(`        ],`);
    console.log(`    },`);
    console.log(`    team2: {`);
    console.log(`        score: ${cachedGameData.team2.score},`);
    console.log(`        players: [`);
    logPlayer("            ", cachedGameData.team2.players[0]);
    logPlayer("            ", cachedGameData.team2.players[1]);
    logPlayer("            ", cachedGameData.team2.players[2]);
    console.log(`        ],`);
    console.log(`    },`);
    console.log(`}`);
}

WsSubscribers.init(49322, false);

WsSubscribers.subscribe("game", "initialized", (data) => {
    console.log("Resetting the data for a new game...");
    cachedGameData = getDefaults();
    timeStep = 0;
    gameInProgress = true;
});

WsSubscribers.subscribe("game", "clock_stopped", (data) => {
    if (gameInProgress && cachedGameData.timeLeft === 0 && cachedGameData.team1.score != cachedGameData.team2.score) {
        gameInProgress = false;
        const winner = cachedGameData.team1.score > cachedGameData.team2.score ? 0 : 1;
        console.log(`Team ${winner + 1} wins!`);
    }
});

WsSubscribers.subscribe("game", "update_state", (data) => {
    if (!gameInProgress) {
        return;
    }
    let players = data.players;
    let playerNames = Object.keys(players);
    if(playerNames.length !== 6) return;
    cachedGameData.timeLeft = data.game.isOT ? 0 : data.game.time_milliseconds;
    cachedGameData.timePassed = GAME_LENGTH - data.game.time_milliseconds + (data.game.isOT ? GAME_LENGTH : 0);

    let scoreUpdated = false;
    if (cachedGameData.team1.score !== data.game.teams["0"].score
     || cachedGameData.team2.score !== data.game.teams["1"].score) {
        scoreUpdated = true;
    }

    cachedGameData.team1.score = data.game.teams["0"].score;
    cachedGameData.team2.score = data.game.teams["1"].score;

    // Ball data
    cachedGameData.ball.location.x = data.game.ball.location.X / MAX_X;
    cachedGameData.ball.location.y = data.game.ball.location.Y / MAX_Y;
    cachedGameData.ball.location.z = data.game.ball.location.Z / MAX_Z;
    cachedGameData.ball.speed = data.game.ball.speed / MAX_BALL_SPEED;

    // Player data
    playerNames.forEach((name) => {
        let team;
        if (data.players[name].team === 0) {
            team = "team1";
        } else {
            team = "team2";
        }
        let index = -1;
        for (let i = 0; i < cachedGameData[team].players.length; i++) {
            if (cachedGameData[team].players[i].name === name) {
                index = i;
                break;
            }
        }
        if (index === -1) {
            for (let i = 0; i < cachedGameData[team].players.length; i++) {
                if (cachedGameData[team].players[i].name === UNINITIALIZED_PLAYER_NAME) {
                    cachedGameData[team].players[i].name = name;
                    index = i;
                    break;
                }
            }
        }
        if (index === -1) {
            cachedGameData.invalidated = true;
        } else {
            cachedGameData[team].players[index].assists = data.players[name].assists;
            cachedGameData[team].players[index].boost = data.players[name].boost / MAX_BOOST;
            cachedGameData[team].players[index].cartouches = data.players[name].cartouches;
            cachedGameData[team].players[index].demos = data.players[name].demos;
            cachedGameData[team].players[index].goals = data.players[name].goals;
            if (data.players[name].location !== undefined) {
                cachedGameData[team].players[index].location.x = data.players[name].location.X / MAX_X;
                cachedGameData[team].players[index].location.y = data.players[name].location.Y / MAX_Y;
                cachedGameData[team].players[index].location.z = data.players[name].location.Z / MAX_Z;
                cachedGameData[team].players[index].location.pitch = data.players[name].location.pitch / MAX_PITCH;
                cachedGameData[team].players[index].location.roll = data.players[name].location.roll / MAX_ROLL;
                cachedGameData[team].players[index].location.yaw = data.players[name].location.yaw / MAX_YAW;
            }
            cachedGameData[team].players[index].saves = data.players[name].saves;
            cachedGameData[team].players[index].score = data.players[name].score;
            cachedGameData[team].players[index].shots = data.players[name].shots;
            cachedGameData[team].players[index].speed = data.players[name].speed / MAX_CAR_SPEED;
            cachedGameData[team].players[index].touches = data.players[name].touches;

            // Modify team2 values to mirror team1 values
            if (team == "team2") {
                if (data.players[name].location !== undefined) {
                    cachedGameData[team].players[index].location.x *= -1;
                    cachedGameData[team].players[index].location.y *= -1;
                    cachedGameData[team].players[index].location.yaw += 1; // add 180 degrees
                    if (cachedGameData[team].players[index].location.yaw > 1) {
                        cachedGameData[team].players[index].location.yaw -= 2; // make sure it is in the range [-1,1]
                    }
                }
            }
        }
    });

    if(scoreUpdated || cachedGameData.timePassed > timeStep) {
        logData(scoreUpdated);
        if (cachedGameData.timePassed > timeStep) timeStep += 1;
    }
});
