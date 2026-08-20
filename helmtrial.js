const Move = (msg) => {
    let Tag = msg.content.split(';');
    let ship = ShipArray[Tag[1]];
    let targetToken = findObjs({_type:"graphic", id: Tag[2]})[0];
    let targetCube = (new Point(targetToken.get("left"),targetToken.get("top"))).toCube();
    let targetLabel = targetCube.label();
    let targetHex = HexMap[targetLabel];
    let startHex = HexMap[ship.hexLabel];
    let distance = targetHex.cube.distance(startHex.cube);

    let theta = startHex.cube.angle(targetHex.cube); //angle to target hex in degrees
    let currentRotation =  Angle(ship.token.get("rotation"));

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

    //get difference in degrees
    let diff = theta - currentRotation;
    diff = diff % 360;
    if (diff > 180) diff -= 360;
    if (diff <= -180) diff += 360;
    diff = Math.abs(diff);
    let numberOfTurnPoints = Math.ceil(diff/30); //number of 30deg turn points needed to rotate towards target hex
    let turnPoints = Math.min(turnPts,numberOfTurnPoints); //number of turn points, either max available or what is needed
    
    let availableThrust = thrust - turnPoints;
    let thrustUsed = 0;
    thrustUsed = Math.min(Math.abs(distance - currentSpeed),availableThrust);

    //move 1 hex per thrustUsed, turning 1 each  Math.floor(thrustUsed/turnPoints) with first turn at start
    //so if 3 turnPoints, and moving 10 hexes, is turn, move 3, turn, move 3, turn, move 4


// too much speed, overshoot ?
//left over speed, continue ?




}