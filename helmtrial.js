const Move = (msg) => {
    let Tag = msg.content.split(';');
    let ship = ShipArray[Tag[1]];
    let target = ShipArray[Tag[2]]; //need to remember to add to array when create the target and delete when done
    let targetHex = HexMap[target.hexLabel];
    let startHex = HexMap[ship.hexLabel];
    let distance = targetHex.cube.distance(startHex.cube);

    //Turning
    let turnNeeded = Math.ceil(AngleDiff(Angle(ship.token.get("rotation")),startHex.cube.angle(targetHex.cube))/30); //number of 30deg turns needed at start

    let thrust = this.maxThrust;
    let currentSpeed = parseInt(this.token.get("bar3_value"));
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
    turnPts = Math.min(turnPts,turnNeeded);

    thrust = Math.max(0,thrust - turnPts);
    let newSpeed; 
    if (distance >= currentSpeed) {
        newSpeed = currentSpeed + Math.min(distance - currentSpeed,thrust); 
    } else {
        newSpeed = currentSpeed - Math.min(currentSpeed - distance,thrust);
    }
    let turnIntervals = Math.floor(newSpeed/turnPts);
    let currentInterval = turnIntervals;
    let turnPtsUsed = 0;

    for (let i=0;i<newSpeed;i++) {
        if (currentInterval >= turnIntervals && turnPtsUsed <= turnPts) {
            let turnNeeded = Math.ceil(AngleDiff(Angle(ship.token.get("rotation")),HexMap[ship.hexLabel].cube.angle(targetHex.cube))/30); 
            if (turnNeeded > 0) {
                turnPtsUsed++;
                currentInterval = 0;

            }
        }
        currentInterval++;
        this.ShipMove();
    }

    //blurb

}


const AngleDiff = (angle1, angle2) => {
    //get difference in degrees
    let diff = angle1 - angle2;
    diff = diff % 360;
    if (diff > 180) diff -= 360;
    if (diff <= -180) diff += 360;
    return Math.abs(diff);
}
