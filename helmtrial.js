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
    let turnPts = Math.round(thrust/turnRate);









}