
    const aStar = () => {
        let startHex = moveInfo.prevHex;
        let goalHex = moveInfo.newHex;
        let unit = moveInfo.unit;
        let maIndex = moveInfo.maIndex;
        let distance = moveInfo.distance;

        let group = DeepCopy(unit.group);
        let movement = unit.movement;
        let moveArray = unit.moveArray; //info on hexes visited this turn
        if (unit.status === "Concealed" && unit.group !== "Gun") {
            //won't be vehicle
            movement = 5; 
            group = "Infantry";
        }
    
        //check if moving back to a prev. hex in moveArray
        if (maIndex > -1) {
            unit.moveCost = moveArray[maIndex].cost;
            //no need to create new markers, but need to remove after index
            for (let i=(maIndex + 1);i<moveArray.length;i++) {
                let markerID = moveArray[i].markerID;
                let marker = findObjs({_type:"graphic", id: markerID})[0];
                if (marker) {
                    marker.remove();
                }
            }
            moveArray.length = (maIndex+1); //0 indexed array
            unit.moveArray = moveArray;
            unit.token.set("rotation",moveArray[maIndex].rotation);
            return;
        }
    
        //if not, find path to goal Hex
        let nodes = 1;
        let explored = [];
        let frontier = [{
            label: startHex.label,
            mapLabel: startHex.mapLabel,
            cost: unit.moveCost,
            estimate: distance, 
            tokenRotation: Angle(unit.token.get("rotation")),
        }];
        
        while (frontier.length > 0) {
            //sort paths in frontier by cost,lowest cost first
            //choose lowest cost path from the frontier
            //if more than one, choose one with highest cost       
            frontier.sort(function(a,b) {
                return a.estimate - b.estimate || b.cost - a.cost; //2nd part used if estimates are same
            })
            let node = frontier.shift();
            let nodeHex = HexMap[node.label];
            nodes++
            //add this node to explored paths
            explored.push(node);
            //if this node reaches goal, end loop
            if (node.label === goalHex.label) {
                break;
            }
            //generate possible next steps
            let next = HexMap[node.label].cube.neighbours();
            //for each possible next step
            for (let i=0;i<next.length;i++) {
                //calculate the cost of the next step 
                //by adding the step's cost to the node's cost
                let stepCube = next[i];
                let rotation = node.tokenRotation;
                let stepHexLabel = stepCube.label();
                let stepHex = HexMap[stepHexLabel];
                if (!stepHex) {continue};
                let costResults = HexCost(stepHex,rotation);
                if (costResults === -1) {continue};
                let stepHexCost = costResults.hexCost;
                rotation = costResults.rotation;
                let cost = stepHexCost + node.cost;
                //check if this step has already been explored
                let isExplored = (explored.find(e=> {
                    return e.label === stepHexLabel
                }));
                //avoid repeated nodes during the calculation of neighbours
                let isFrontier = (frontier.find(e=> {
                    return e.label === stepHexLabel
                }));
                //if this step has not been explored
                if (!isExplored && !isFrontier) {
                    let est = cost + stepHex.cube.distance(goalHex.cube);
                    //add the step to the frontier, using the cost and distance
                    frontier.push({
                        label: stepHex.label,
                        mapLabel: stepHex.mapLabel,
                        cost: cost,
                        estimate: est,
                        tokenRotation: rotation,
                    });
                }
            }
        }
    
        //If there are no paths left to explore or hit target hex
        if (explored.length > 0) {
            array = [];
            results = [];
            explored.sort((a,b) => {
                return b.cost - a.cost;
            })
            let last = explored.shift(); //end hex
            array.push(last);
            let finished = explored.length > 0 ? false:true;
    
            while (finished === false) {
                let lowestCost = last.cost;
                let current = 0;
                for (let i=0;i<explored.length;i++) {
                    let next = explored[i];
                    if (HexMap[next.label].cube.distance(HexMap[last.label].cube) === 1 && next.cost < lowestCost) {
                        lowestCost = next.cost;
                        current = i;
                    }
                }
                last = explored[current];
                explored.splice(current,1);
                array.push(last);
                if (last.label === startHex.label) {
                    finished = true;
                }
            }
            array.reverse();
    
            //redo costs and work out final rotations based on this final path
            //place markers
            //check concealment
            let cost = unit.moveCost;
            let rotation = array[0].tokenRotation;
            let prevHex = HexMap[array[0].label];
            if (unit.moveCost === 0) {
                let markerID = CreateMarker(prevHex,"Move",array[0].cost);
                let move = {
                    hexLabel: array[0].label,
                    mapLabel: array[0].mapLabel,
                    cost: 0,
                    rotation: array[0].tokenRotation,
                    markerID: markerID,
                    flagged: false,
                }
                moveArray.push(move);
            }

            for (let i=1;i<array.length;i++) {
                let nextHex = HexMap[array[i].label];
                let costResults = HexCost(nextHex,rotation);
                let hexCost = costResults.hexCost;
                let init = rotation;
                rotation = costResults.rotation;
                if (cost + hexCost > movement) {
                    break;
                }
                if (init !== rotation && unit.token.get(SM.moved) === false) {
                    unit.token.set(SM.rotate,true);
                } 
                cost += hexCost;
                let markerID = CreateMarker(nextHex,"Move",cost);
                unit.hexLabel = array[i].label;
                let flagged = CheckConcealment(unit);
                let move = {
                    hexLabel: array[i].label,
                    mapLabel: array[i].mapLabel,
                    cost: cost,
                    rotation: rotation,
                    markerID: markerID,
                    flagged: flagged,
                }
                moveArray.push(move);
                lastHex = nextHex;
            }
        } else {
            sendChat("","No Path")
        }
        return;
    }