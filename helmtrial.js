const Move = (msg) => {
    let Tag = msg.content.split(';');
    let ship = ShipArray[Tag[1]];
    let target = ShipArray[Tag[2]]; //need to remember to add to array when create the target and delete when done
    let targetHex = HexMap[target.hexLabel];
    let startHex = HexMap[ship.hexLabel];
    let distance = targetHex.cube.distance(startHex.cube);
    SetupCard(ship.name,"Helm",ship.faction);

    let thrust = this.maxThrust;
    let startSpeed = parseInt(this.token.get("bar3_value"));
    let turnRate = parseInt(this.turn);
    let impulse1 = Attribute(this.charID,"impulse1") === "Offline" ? false:true;
    let impulse2 = Attribute(this.charID,"impulse2") === "Offline" ? false:true;
    if (impulse1 === false || impulse2 === false) {
        thrust = Math.round(thrust/2); //one engine down
    }
    if (impulse1 === false && impulse2 === false) {
        thrust = 0; //no engines
    }
    let cloaked = false;
    if (this.token.get("tint_color") === "#000000") {
        cloaked = true;
    }
    if (cloaked) {
        thrust = Math.round(thrust/2); //cloaked
    }
    let turnPts = Math.round(thrust/turnRate); //max turn points based on thrust

    let turnIntervals = Math.floor(startSpeed/turnPts);

    let currentInterval = turnIntervals; //used to track how many hexes moved since last turn
    let turnPtsUsed = 0;
    let speedUsed = 0;
    let thrustUsed = 0;
    let maxD = Math.min(distance,startSpeed + thrust);
    let endSpeed = 0;

    for (let i=0;i< maxD;i++) {
        let turnNeeded = Math.ceil(AngleDiff(Angle(ship.token.get("rotation")),HexMap[ship.hexLabel].cube.angle(targetHex.cube))/30); 
        let currentDistance = HexMap[ship.hexLabel].cube.distance(targetHex.cube);
        if (currentInterval >= turnIntervals && turnPtsUsed <= turnPts && turnNeeded > 0) {
            turnPtsUsed++;
            thrustUsed++;
            currentInterval = 0;
            //turn
        }
        currentInterval++;
        if (currentDistance > 0) {
            //is there speed or thrust left
            if (speedUsed + thrustUsed < startSpeed + thrust) {
                ship.ShipMove();
                if (speedUsed < startSpeed) {
                    speedUsed++;
                    endSpeed++;
                } else {
                    thrustUsed++;
                    endSpeed++;
                }
            }
        } else {break}
    }
    //is there an overshoot ?
    let currentDistance = HexMap[ship.hexLabel].cube.distance(targetHex.cube);
    if (currentDistance === 0) {
        let remainingSpeed = currentSpeed - speedUsed;
        let remainingThrust = thrust - thrustUsed;
        remainingSpeed -= remainingThrust;
        if (remainingSpeed > 0) {
            endSpeed += remainingSpeed;
            for (let i=0;i<remainingSpeed;i++) {
                ship.ShipMove();
            }
            outputCard.body.push("[Ship using Thrust to Slow Speed]")
        }
    }

    outputCard.body.push("Speed: " + endSpeed);
    outputCard.body.push("Heading: " + Angle(ship.token.get("rotation")));
    PrintCard();

}


const AngleDiff = (angle1, angle2) => {
    //get difference in degrees
    let diff = angle1 - angle2;
    diff = diff % 360;
    if (diff > 180) diff -= 360;
    if (diff <= -180) diff += 360;
    return Math.abs(diff);
}
