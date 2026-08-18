
    const CheckLOS = (msg) => {
        let Tag = msg.content.split(";");
        let shooter = ShipArray[Tag[1]];
        let target = ShipArray[Tag[2]];

        if (!shooter) {
            sendChat("","Not valid shooter");
            return;
        }
        if (!target) {
            sendChat("","Not valid target");
            return;
        }
        if (shooter.id == target.id) {
            sendChat("","Selected Same Token");
            return;
        }
        SetupCard(shooter.name,"Scan Target",shooter.faction);

        let losResult = LOS(shooter,target);
    
        outputCard.body.push("Distance: " + losResult.distance + " Hexes");
        if (losResult.los === false) {
            outputCard.body.push("[#ff0000]No LOS[/#]");
            outputCard.body.push(losResult.losReason);
        } else {
            outputCard.body.push("[B]" + target.name + "[/b]");
            outputCard.body.push("Distance: " + losResult.distance);
            if (target.token.get("#000000")) {
                losResult.distance *= 2;
                outputCard.body.push("Ship is Cloaked");
                outputCard.body.push("[Effective Distance: " + (losResult.distance));
            }
            outputCard.body.push("[hr]");
            outputCard.body.push("[U]Weapons Solutions[/u]");
            let shooterArcs = losResult.shooterArcs;
            let arcs = shooterArcs.map((e) => ArcNames[e]);
            arcs = arcs.toString().replace(","," & ");
            let s = (shooterArcs.length === 1) ? "":"s";
            let weaponTypes = {};
            let none = true;
            for (let i=0;i<shooter.weaponArray.length;i++) {
                let weapon = shooter.weaponArray[i];
                let type = weapon.type;
                let facing = weapon.facing; //will be an array of facing #s
                let inArc = facing.some(item => shooterArcs.includes(item));
                if (losResult.distance <= weapon.maxRange && inArc === true) {
                    none = false;
                    if (weaponTypes[type]) {
                        weaponTypes[type]++;
                    } else {
                        weaponTypes[type] = 1;
                    }
                }
            }
            if (none === true) {
                outputCard.body.push("No Weapons in Range or Arc");
            } else {
                let keys = Object.keys(weaponTypes);
                for (let i=0;i<keys.length;i++) {
                    let type = keys[i];
                    let number = weaponTypes[type];
                    let verb = (number === 1) ? " has ":" have ";
                    let s = (number === 1) ? "":"s";
                    if (Projectiles.includes(type)) {


                    } else {



                    }
//temp
                    outputCard.body.push(type + " " + number)



                }
            }
            outputCard.body.push("[hr]");
            outputCard.body.push("[U]Target Information[/u]");
            let shields = target.token.get("bar2_value");
            let shieldsMax = target.token.get("bar2_max");
            shields = parseInt(shields/shieldsMax * 100);
            if (shields > 0) {
                outputCard.body.push("Shields are at " + shields + "%");
            } else {
                outputCard.body.push("Shields are Down")
            }
            let hull = target.token.get("bar1_value");
            let hullMax = target.token.get("bar1_max");
            hull = parseInt(hull/hullMax * 100);
            outputCard.body.push("Hull Integrity is " + hull + "%");
            let damagedSystems = target.damagedSystems;
            if (damagedSystems.length > 0) {
                outputCard.body.push("Damage to " + damagedSystems.toString());
            } else {
                outputCard.body.push("No Damaged to Systems")
            }




        }

        
        PrintCard();
    }