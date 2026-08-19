class A {
    aStar(startHex,goalHex) {
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
        let currentHeading =  Math.round(Angle(ship.token.get("rotation")));
        
        let distance = goalHex.cube.distance(startHex.cube);

        let nodes = 1;
        let explored = [];
        let frontier = [{
            label: startHex.label,
            cost: 0,
            estimate: distance,
            heading: currentHeading,
        }];

        while (frontier.length > 0) {
            frontier.sort(function(a,b) {
                return a.estimate - b.estimate || b.cost - a.cost;
            })
            let node = frontier.shift();
            let nodeHex = HexMap[node.label];
            nodes++;
            explored.push(node);
            if (node.label === goalHex.label) {break};
            //possible next steps
            let next = HexMap[node.label].cube.neighbours();
//edge of map removals here
            //for each possible next step
            for (let i=0;i<next.length;i++) {
                //calculate the cost of the next step 
                //by adding the step's cost to the node's cost
                let stepCube = next[i];








            }




        }

    }

}