# Rocket League Scribe

## About

Rocket League Scribe is a program written to periodically store snapshots of data from a Rocket League 3v3 match a user is spectating or a replay they are watching.

## Dependencies

Rocket League Scribe assumes that sos-ws-relay-master is running and outputting to port 49322.

## To run:

1. Launch Rocket League with BakkesMod and the SOS Plugin injected.
1. Run sos-ws-relay-master (`npm run relay` in the sos-ws-relay-master folder). Use the default values each time it prompts you at startup.
1. Run `npm start` in this folder.
1. Start spectating a match or watching a replay. When the match or replay finishes, it will write to a file.

## Known issues:

* No data is recorded after the clock reaches 0 and before the ball hits the ground.
