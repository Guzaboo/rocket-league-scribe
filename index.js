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

const GAME_LENGTH = 300;

function getDefaults() {
    return JSON.parse(JSON.stringify({
        timeLeft: GAME_LENGTH,
        timePassed: 0,
        team1: {
            score: 0,
            players: [
                {
                    assists: 0,
                    boost: 0,
                    demos: 0,
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
                },
                {
                    assists: 0,
                    boost: 0,
                    demos: 0,
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
                },
                {
                    assists: 0,
                    boost: 0,
                    demos: 0,
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
                }
            ]
        },
        team2: {
            score: 0,
            players: [
                {
                    assists: 0,
                    boost: 0,
                    demos: 0,
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
                },
                {
                    assists: 0,
                    boost: 0,
                    demos: 0,
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
                },
                {
                    assists: 0,
                    boost: 0,
                    demos: 0,
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
                }
            ]
        },
    }));
}

let cachedGameData = getDefaults();

WsSubscribers.init(49322, false);
WsSubscribers.subscribe("game", "initialized", (data) => {
    cachedGameData = getDefaults();
});
WsSubscribers.subscribe("game", "goal_scored", (data) => {
    console.log(data);
    if(data.scorer.teamnum === 0) cachedGameData.team1.score++;
    else cachedGameData.team2.score++;
    console.log(cachedGameData);
});
WsSubscribers.subscribe("game", "clock_updated_seconds", (data) => {
    console.log(cachedGameData);
});
WsSubscribers.subscribe("game", "update_state", (data) => {
    let players = data.players;
    let playerNames = Object.keys(players);
    if(playerNames.length !== 6) return
    cachedGameData.timeLeft = data.game.isOT ? 0 : data.game.time_milliseconds
    cachedGameData.timePassed = GAME_LENGTH - data.game.time_milliseconds + (data.game.isOT ? GAME_LENGTH : 0)
    cachedGameData.team1_score = data.game.teams["0"].score
    cachedGameData.team2_score = data.game.teams["1"].score
});
