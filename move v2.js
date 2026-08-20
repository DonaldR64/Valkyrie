const Move = (msg) => {
    let id = msg.selected[0]._id;
    let lastWaypoint = ShipArray[id];
    let ship = ShipArray[lastWaypoint.referenceShipID];

    let waypoints = ship.waypoints;

    let currentHex = HexMap[ship.hexLabel];

    let thrust = ship.maxThrust;
    let startSpeed = parseInt(ship.token.get("bar3_value"));
log("Start Speed: " + startSpeed)
    let turnRate = parseInt(ship.turn);
    let impulse1 = Attribute(ship.charID,"impulse1") === "Offline" ? false:true;
    let impulse2 = Attribute(ship.charID,"impulse2") === "Offline" ? false:true;
    if (impulse1 === false || impulse2 === false) {
        thrust = Math.round(thrust/2); //one engine down
    }
    if (impulse1 === false && impulse2 === false) {
        thrust = 0; //no engines
    }
    let cloaked = false;
    if (ship.token.get("tint_color") === "#000000") {
        cloaked = true;
    }
    if (cloaked) {
        thrust = Math.round(thrust/2); //cloaked
    }
    let turnPts = Math.round(thrust/turnRate); //max turn points based on thrust
log("Thrust: " + thrust)
    let turnIntervals = Math.floor(startSpeed/turnPts);
log("Turn Intervals: " + turnIntervals)
    let currentInterval = turnIntervals; //used to track how many hexes moved since last turn
    let turnPtsUsed = 0;
    let speedUsed = 0;
    let thrustUsed = 0;
    let endSpeed = 0;
    let totalAvail = startSpeed + thrust;

    for (let i=0;i<waypoints.length;i++) {
        let waypoint = waypoints[i];
        let targetHex = HexMap[waypoint.hexLabel];
        let distance = HexMap[ship.hexLabel].cube.distance(targetHex.cube);
        waypointMovement:
        if (distance === 0) {continue};
        do {
            let angleDif = AngleDiff(Angle(ship.token.get("rotation")),HexMap[ship.hexLabel].cube.angle(targetHex.cube));
            let turnNeeded = Math.floor(angleDif/30); 
            let currentDistance = HexMap[ship.hexLabel].cube.distance(targetHex.cube);

log("I: " + i)
log("Hex: " + ship.hexLabel);
log("Angle Difference: " + angleDif)
log("Turn Needed: " + turnNeeded)
log("Current Distance: " + currentDistance)

            //Turn allowed and needed?
            if (currentInterval >= turnIntervals && turnPtsUsed <= turnPts && turnNeeded > 0) {
                turnPtsUsed++;
                thrustUsed++;
                currentInterval = 0;
                let arcs = ship.Arcs(target);
log("Arcs: " + arcs.toString());
                let rotation = Angle(ship.token.get("rotation"));
                if (arcs.includes(2) || arcs.includes(3)) {
log("Turn to Starboard")
                    ship.token.set("rotation", (rotation + 30));
                } else if (arcs.includes(5) || arcs.includes(6)) {
log("Turn to Port")
                    ship.token.set("rotation", (rotation - 30));
                } else if (arcs.includes(4)) {
                    //directly behind, randomly pick
                    let rnd = randomInteger(2);
                    if (rnd === 1) {
                        ship.token.set("rotation", (rotation + 30));
                    } else {
                        ship.token.set("rotation", (rotation - 30));
                    }
log("Is Astern")
                } else {
log("Arcs: " + arcs.toString())
log("? why turning")
                }
            }
            //move needed?
            if (currentDistance > 0) {
                //is there speed or thrust left
                if (speedUsed + thrustUsed < startSpeed + thrust) {
                    currentInterval++;
                    ship.ShipMove();
                    if (speedUsed < startSpeed) {
                        speedUsed++;
                        endSpeed++;
                    } else {
                        thrustUsed++;
                        endSpeed++;
                    }
                }
            }

            totalUsed = speedUsed + thrustUsed;
            currentDistance = HexMap[ship.hexLabel].cube.distance(targetHex.cube);


        } while (
            currentDistance > 0 && totalUsed < totalAvail
        )
    }
    //is there an overshoot ?
    let remainingSpeed = startSpeed - speedUsed;
    let remainingThrust = thrust - thrustUsed;
    remainingSpeed -= remainingThrust;
    if (remainingSpeed > 0) {
        endSpeed += remainingSpeed;
        for (let i=0;i<remainingSpeed;i++) {
            ship.ShipMove();
            if (ship.Offmap()) {
                break;
            }
        }
        outputCard.body.push("[Ship using Thrust to Slow Speed]")
    }










}