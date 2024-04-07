# Rocket League Scribe

## About

Rocket League Scribe is a program written to periodically store snapshots of data from a Rocket League match a user is spectating or a replay they are watching.

## Dependencies

Rocket League Scribe assumes that sos-ws-relay-master is running and outputting to port 49322.

## To run:

1. Run sos-ws-relay-master
2. Run `npm start`.
3. Launch Rocket League.
4. Start spectating a match or watching a replay. When the match or replay finishes, it will write to a file.

## Known issues:

* No data is recorded after the clock reaches 0 and before the ball hits the ground.
