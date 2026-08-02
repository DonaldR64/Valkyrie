const Main = (() => {
    const version = '2026.7.22';
    if (!state.FullThrust) {state.FullThrust = {}};

    const pageInfo = {};
    const rowLabels = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","AA","AB","AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN","AO","AP","AQ","AR","AS","AT","AU","AV","AW","AX","AY","AZ","BA","BB","BC","BD","BE","BF","BG","BH","BI"];

    let HexSize, HexInfo, DIRECTIONS;

    //math constants
    const M = {
        f0: Math.sqrt(3),
        f1: Math.sqrt(3)/2,
        f2: 0,
        f3: 3/2,
        b0: Math.sqrt(3)/3,
        b1: -1/3,
        b2: 0,
        b3: 2/3,
    }

    const ArcNames = ["","Fore","Starboard Fore","Starboard Aft","Aft","Port Aft","Port Fore"];
    const Projectiles = ["Pulse Torpedo","Photon Torpedo"]



    const DefineHexInfo = () => {
        HexSize = (70 * pageInfo.scale)/M.f0;
        if (pageInfo.type === "hex") {
            HexInfo = {
                size: HexSize,
                pixelStart: {
                    x: 35 * pageInfo.scale,
                    y: HexSize,
                },
                width: 70  * pageInfo.scale,
                height: pageInfo.scale*HexSize,
                xSpacing: 70 * pageInfo.scale,
                ySpacing: 3/2 * HexSize,
                directions: {
                    "Northeast": new Cube(1,-1,0),
                    "East": new Cube(1,0,-1),
                    "Southeast": new Cube(0,1,-1),
                    "Southwest": new Cube(-1,1,0),
                    "West": new Cube(-1,0,1),
                    "Northwest": new Cube(0,-1,1),
                },
                halfToggleX: 35 * pageInfo.scale,
                halfToggleY: 0,
            }
            DIRECTIONS = ["Northeast","East","Southeast","Southwest","West","Northwest"];
        } else if (pageInfo.type === "hexr") {
            //Hex H or Flat Topped
            HexInfo = {
                size: HexSize,
                pixelStart: {
                    x: HexSize,
                    y: 35 * pageInfo.scale,
                },
                width: pageInfo.scale*HexSize,
                height: 70  * pageInfo.scale,
                xSpacing: 3/2 * HexSize,
                ySpacing: 70 * pageInfo.scale,
                directions: {
                    "North": new Cube(0, -1, 1),
                    "Northeast": new Cube(1, -1, 0),
                    "Southeast": new Cube(1,0,-1),
                    "South": new Cube(0,1,-1),
                    "Southwest": new Cube(-1,1,0),
                    "Northwest": new Cube(-1,0,1),
                },
                halfToggleX: 0,
                halfToggleY: 35 * pageInfo.scale,
            }
            DIRECTIONS = ["North","Northeast","Southeast","South","Southwest","Northwest"];
        }
    }

    let ShipArray = {};

    let outputCard = {title: "",subtitle: "",side: "",body: [],buttons: [],};

    const Factions = {
        "Neutral": {
            "image": "",
            "dice": "Neutral",
            "backgroundColour": "#FFFFFF",
            "titlefont": "Arial",
            "fontColour": "#000000",
            "borderColour": "#00FF00",
            "borderStyle": "5px ridge",
            "objColour": "#ffffff",
        },
        "Klingon": {
            "image": "",
            "dice": "Klingon",
            "backgroundColour": "#000000",
            "objColour": "#000000",
            "titlefont": "Anton",
            "fontColour": "#ffffff",
            "borderColour": "#000000",
            "borderStyle": "5px ridge",
        },
        "Federation": {
            "image": "",
            "dice": "Federation",
            "backgroundColour": "#0000CD",
            "objColour": "#0000CD",
            "titlefont": "Arial",
            "fontColour": "#ffffff",
            "borderColour": "#0000CD",
            "borderStyle": "5px ridge",  
        },
    };


    const SM = {
        ooc: "status_red", //ooc - change
        nolife: "status_green", //life support - change
        warp: "status_blue", //warp core critical
        nopower: "status_brown", //no power, drifting
    }


    const Capit = (val) => {
        return String(val).charAt(0).toUpperCase() + String(val).slice(1);
    }



    const simpleObj = (o) => {
        let p = JSON.parse(JSON.stringify(o));
        return p;
    };

    const getCleanImgSrc = (imgsrc) => {
        let parts = imgsrc.match(/(.*\/images\/.*)(thumb|med|original|max)([^?]*)(\?[^?]+)?$/);
        if(parts) {
            return parts[1]+'thumb'+parts[3]+(parts[4]?parts[4]:`?${Math.round(Math.random()*9999999)}`);
        }
        return;
    };

    const tokenImage = (img) => {
        //modifies imgsrc to fit api's requirement for token
        img = getCleanImgSrc(img);
        img = img.replace("%3A", ":");
        img = img.replace("%3F", "?");
        img = img.replace("med", "thumb");
        return img;
    };

    const DeepCopy = (variable) => {
        variable = JSON.parse(JSON.stringify(variable))
        return variable;
    };

    const PlaySound = (name) => {
        let sound = findObjs({type: "jukeboxtrack", title: name})[0];
        if (sound) {
            sound.set({playing: true,softstop:false});
        }
    };







    const pointInPolygon = (point,vertices) => {
        //evaluate if point is in the polygon
        px = point.x
        py = point.y
        collision = false
        len = vertices.length - 1
        for (let c=0;c<len;c++) {
            vc = vertices[c];
            vn = vertices[c+1]
            if (((vc.y >= py && vn.y < py) || (vc.y < py && vn.y >= py)) && (px < (vn.x-vc.x)*(py-vc.y)/(vn.y-vc.y)+vc.x)) {
                collision = !collision
            }
        }
        return collision
    }

    const translatePoly = (poly) => {
        //translate points in a pathv2 polygon to map points
        let vertices = [];
        let points = JSON.parse(poly.get("points"));
        let centre = new Point(poly.get("x"), poly.get("y"));
        //covert path points from relative coords to actual map coords
        //define 'bounding box;
        let minX = Infinity,minY = Infinity, maxX = 0, maxY = 0;
        _.each(points,pt => {
            minX = Math.min(pt[0],minX);
            minY = Math.min(pt[1],minY);
            maxX = Math.max(pt[0],maxX);
            maxY = Math.max(pt[1],maxY);
        })
        //translate each point back based on centre of box
        let halfW = (maxX - minX)/2 + minX;
        let halfH = (maxY - minY)/2 + minY
        let zeroX = centre.x - halfW;
        let zeroY = centre.y - halfH;
        _.each(points,pt => {
            let x = Math.round(pt[0] + zeroX);
            let y = Math.round(pt[1] + zeroY);
            vertices.push(new Point(x,y));
        })
        return vertices;
    }


    const KeyNum = (ship,keyword) => {
        let key = ship.keywords.split(",");
        let num = 1;
        _.each(key,word => {
            if (word.includes(keyword)) {
                word = word.trim().replace(keyword,"").replace("(","").replace(")","");
                num = parseInt(word);
            }
        })
        return num;
    }


    //Retrieve Values from character Sheet Attributes
    const Attribute = (characterID,attributename,max = false) => {
        //Retrieve Values from character Sheet Attributes
        let attributeobj = findObjs({type:'attribute',characterid: characterID, name: attributename})[0]
        let attributevalue = "";
        if (attributeobj && max === false) {
            attributevalue = attributeobj.get('current');
        } else if (attributeobj && max === true) {
            attributevalue = attributeobj.get('max');
        }
        return attributevalue;
    };

    const AttributeID = (characterID,attributename) => {
        let attributeobj = findObjs({type:'attribute',characterid: characterID, name: attributename})[0];
        return attributeobj.get("id");
    }







    const AttributeArray = (characterID) => {
        let aa = {}
        let attributes = findObjs({_type:'attribute',_characterid: characterID});
        for (let j=0;j<attributes.length;j++) {
            let name = attributes[j].get("name")
            let current = attributes[j].get("current")   
            if (!current || current === "") {current = " "} 
            aa[name] = current;
            let max = attributes[j].get("max")   
            if (!max || max === "") {max = " "} 
            aa[name + "_max"] = max;
        }
        return aa;
    };

    const AttributeSet = (characterID,attributename,newvalue,max = false) => {
        let attributeobj = findObjs({type:'attribute',characterid: characterID, name: attributename})[0]
        if (attributeobj) {
            if (max === true) {
                attributeobj.set("max",newvalue)
            } else {
                attributeobj.set("current",newvalue)
            }
        } else {
            if (max === true) {
                createObj("attribute", {
                    name: attributename,
                    current: newvalue,
                    max: newvalue,
                    characterid: characterID,
                });            
            } else {
                createObj("attribute", {
                    name: attributename,
                    current: newvalue,
                    characterid: characterID,
                });            
            }
        }
        return;
    };

    const DeleteAttribute = (characterID,attributeName) => {
        let attributeObj = findObjs({type:'attribute',characterid: characterID, name: attributeName})[0]
        if (attributeObj) {
            attributeObj.remove();
        }
    }

    class Point {
        constructor(x,y) {
            this.x = x;
            this.y = y;
        };
        toOffset() {
            let cube = this.toCube();
            let offset = cube.toOffset();
            return offset;
        };
        toCube() {
            let x = this.x - HexInfo.pixelStart.x;
            let y = this.y - HexInfo.pixelStart.y;
            let q,r;
            if (pageInfo.type === "hex") {
                q = (M.b0 * x + M.b1 * y) / HexInfo.size;
                r = (M.b3 * y) / HexInfo.size;
            } else if (pageInfo.type === "hexr") {
                q = (M.b3 * x) / HexInfo.size;
                r = (M.b1 * x + M.b0 * y) / HexInfo.size;
            }
            let cube = new Cube(q,r,-q-r).round();
            return cube;
        };
        distance(b) {
            return Math.sqrt(((this.x - b.x) * (this.x - b.x)) + ((this.y - b.y) * (this.y - b.y)));
        }
        label() {
            return this.toCube().label();
        }
    }

    class Offset {
        constructor(col,row) {
            this.col = col;
            this.row = row;
        }
        label() {
            let label = rowLabels[this.row] + (this.col + 1).toString();
            return label;
        }
        toCube() {
            let q,r;
            if (pageInfo.type === "hex") {
                q = this.col - (this.row - (this.row&1))/2;
                r = this.row;
            } else if (pageInfo.type === "hexr") {
                q = this.col;
                r = this.row - (this.col - (this.col&1))/2;
            }
            let cube = new Cube(q,r,-q-r);
            cube = cube.round(); 
            return cube;
        }
        toPoint() {
            let cube = this.toCube();
            let point = cube.toPoint();
            return point;
        }
    };

    const Angle = (theta) => {
        while (theta < 0) {
            theta += 360;
        }
        while (theta >= 360) {
            theta -= 360;
        }
        return theta
    }   

    class Cube {
        constructor(q,r,s) {
            this.q = q;
            this.r =r;
            this.s = s;
        }

        add(b) {
            return new Cube(this.q + b.q, this.r + b.r, this.s + b.s);
        }
        angle(b) {
            //angle between 2 cubes
            let origin = this.toPoint();
            let destination = b.toPoint();

            let x = Math.round(origin.x - destination.x);
            let y = Math.round(origin.y - destination.y);
            let phi = Math.atan2(y,x);
            phi = phi * (180/Math.PI);
            phi = Math.round(phi);
            phi -= 90;
            phi = Angle(phi);
            return phi;
        }        
        subtract(b) {
            return new Cube(this.q - b.q, this.r - b.r, this.s - b.s);
        }
        static direction(direction) {
            return HexInfo.directions[direction];
        }
        neighbour(direction) {
            //returns a hex (with q,r,s) for neighbour, specify direction eg. hex.neighbour("NE")
            return this.add(HexInfo.directions[direction]);
        }
        neighbours() {
            //all 6 neighbours
            let results = [];
            for (let i=0;i<DIRECTIONS.length;i++) {
                results.push(this.neighbour(DIRECTIONS[i]));
            }
            return results;
        }

        len() {
            return (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2;
        }
        distance(b) {
            return this.subtract(b).len();
        }
        lerp(b, t) {
            return new Cube(this.q * (1.0 - t) + b.q * t, this.r * (1.0 - t) + b.r * t, this.s * (1.0 - t) + b.s * t);
        }
        linedraw(b) {
            //returns array of hexes between this hex and hex 'b' incl. hex 'b'
            var N = this.distance(b);
            var a_nudge = new Cube(this.q + 1e-06, this.r + 1e-06, this.s - 2e-06);
            var b_nudge = new Cube(b.q + 1e-06, b.r + 1e-06, b.s - 2e-06);
            var results = [];
            var step = 1.0 / Math.max(N, 1);
            for (var i = 1; i <= N; i++) {
                results.push(a_nudge.lerp(b_nudge, step * i).round());
            }
            return results;
        }

        linedraw2(b) {
            //returns array of hexes between this hex and hex 'b' incl. hex 'b', nudging other way from above 
            var N = this.distance(b);
            var a_nudge = new Cube(this.q - 1e-06, this.r - 1e-06, this.s + 2e-06);
            var b_nudge = new Cube(b.q - 1e-06, b.r - 1e-06, b.s + 2e-06);
            var results = [];
            var step = 1.0 / Math.max(N, 1);
            for (var i = 1; i <= N; i++) {
                results.push(a_nudge.lerp(b_nudge, step * i).round());
            }
            return results;
        }



        label() {
            let offset = this.toOffset();
            let label = offset.label();
            return label;
        }

        spiralToCube(index) {
            if (index === 0) {
                return this;
            } else {
                let radius = (index === 0) ? 0:Math.floor((Math.sqrt(12 * index - 3) + 3) / 6);
                let startIndex = (radius === 0) ? 0: 1 + 3 * radius * (radius - 1);
                let ring = this.ring(radius);
                let pos = index - startIndex;
                return ring[pos];
            }
        }




        radius(rad) {
            //returns array of hexes in radius rad
            //Not only is x + y + z = 0, but the absolute values of x, y and z are equal to twice the radius of the ring
            let results = [];
            let h;
            for (let i = 0;i <= rad; i++) {
                for (let j=-i;j<=i;j++) {
                    for (let k=-i;k<=i;k++) {
                        for (let l=-i;l<=i;l++) {
                            if((Math.abs(j) + Math.abs(k) + Math.abs(l) === i*2) && (j + k + l === 0)) {
                                h = new Cube(j,k,l);
                                results.push(this.add(h));
                            }
                        }
                    }
                }
            }
            return results;
        }

        ring(radius) {
            let results = [];
            let b = new Cube(-1 * radius,0,1 * radius);  //start at west 
            let cube = this.add(b);
            for (let i=0;i<6;i++) {
                //for each direction
                for (let j=0;j<radius;j++) {
                    results.push(cube);
                    cube = cube.neighbour(DIRECTIONS[i]);
                }
            }
            return results;
        }

        round() {
            var qi = Math.round(this.q);
            var ri = Math.round(this.r);
            var si = Math.round(this.s);
            var q_diff = Math.abs(qi - this.q);
            var r_diff = Math.abs(ri - this.r);
            var s_diff = Math.abs(si - this.s);
            if (q_diff > r_diff && q_diff > s_diff) {
                qi = -ri - si;
            }
            else if (r_diff > s_diff) {
                ri = -qi - si;
            }
            else {
                si = -qi - ri;
            }
            return new Cube(qi, ri, si);
        }
        toPoint() {
            let x,y;
            if (pageInfo.type === "hex") {
                x = (M.f0 * this.q + M.f1 * this.r) * HexInfo.size;
                y = 3/2 * this.r * HexInfo.size;
            } else if (pageInfo.type === "hexr") {
                x = 3/2 * this.q * HexInfo.size;
                y = (M.f1 * this.q + M.f0 * this.r) * HexInfo.size;
            }
            x += HexInfo.pixelStart.x;
            y += HexInfo.pixelStart.y;
            let point = new Point(x,y);
            return point;
        }
        toOffset() {
            let col,row;
            if (pageInfo.type === "hex") {
                col = this.q + (this.r - (this.r&1))/2;
                row = this.r;
            } else if (pageInfo.type === "hexr") {
                col = this.q;
                row = this.r + (this.q - (this.q&1))/2;
            }
            let offset = new Offset(col,row);
            return offset;
        }
        whatDirection(b) {
            let delta = new Cube(b.q - this.q,b.r - this.r, b.s - this.s);
            let dir = "Unknown";
            let keys = Object.keys(HexInfo.directions);
            for (let i=0;i<6;i++) {
                let d = HexInfo.directions[keys[i]];
                if (d.q === delta.q && d.r === delta.r && d.s === delta.s) {
                    dir = keys[i];
                }
            }
            return dir
        }

     
    };

    class Hex {
        constructor(point) {
            this.centre = point;
            let offset = point.toOffset();
            this.offset = offset;
            this.terrain = "Empty Space";
            this.tokenIDs = [];
            this.cube = offset.toCube();
            this.label = offset.label();
            HexMap[this.label] = this;
        }

        distance(b) {
            let dist = this.cube.distance(b.cube);
            return dist;
        }




    }

    class Ship {
        constructor(id) {
            let token = findObjs({_type:"graphic", id: id})[0];
            let cube = (new Point(token.get("left"),token.get("top"))).toCube();
            let label = cube.label();
            let charID = token.get("represents");
            let char = getObj("character", charID); 

            let aa = AttributeArray(charID);
  
            this.charName = char.get("name");
            let name = token.get("name");
            if (!name || name === "") {
                name = this.charName;
            }
            this.name = name;
            this.hexLabel = label;

            this.id = id;
            this.charID = charID;
            let faction = aa.faction || "Neutral";
            this.faction = faction;
            let player = (state.FullThrust.factions.indexOf(faction));
            if (player === -1) {
                if (faction === "Neutral") {
                    player = 2
                } else {
                    state.FullThrust.factions.push(faction);
                    player = state.FullThrust.factions.length - 1;
                }
            }
            this.player = player;
            this.token = token;
            this.type = aa.type;

            this.hullMax = parseInt(aa.hull_max) || 0;

            let weaponArray = [];
            for (let w=1;w<13;w++) {
                let weaponStatus = aa["weapon" + w + "status"];
                let weaponName = aa["weapon" + w + "name"];
                if (weaponStatus === "Off" || !weaponName) {continue};
                let weaponType = aa["weapon" + w + "type"];
                let weaponFacing = aa["weapon" + w + 'facing'].split("/").map((e) => parseInt(e));
                let maxRange;
                if (weaponType === "Class 1 Phaser") {maxRange = 6};
                if (weaponType === "Class 2 Phaser") {maxRange = 12};
                if (weaponType === "Class 3 Phaser") {maxRange = 18};
                if (weaponType === "Disruptor") {maxRange = 6};
                if (weaponType === "Disruptor Mk.2") {maxRange = 12};
                if (Projectiles.includes(weaponType)) {
                    maxRange = 15;
                }
                let weapon = {
                    number: w,
                    status: weaponStatus,
                    name: weaponName,
                    type: weaponType,
                    facing: weaponFacing,
                    maxRange: maxRange,
                }
                weaponArray.push(weapon);
            }
            this.weaponArray = weaponArray;
            this.hull = parseInt(token.get("bar1_value")) || 0;
            this.shields = parseInt(token.get("bar2_value")) || 0;
            this.shieldsMax = parseInt(token.get("bar2_max")) || 0;

            ShipArray[id] = this;
            let index = HexMap[label].tokenIDs.indexOf(id);
            if (index < 0) {
                HexMap[label].tokenIDs.push(id);
            }


        }

        Arcs(b) {
            let phi = Angle(HexMap[this.hexLabel].cube.angle(HexMap[b.hexLabel].cube));
            phi = Angle(phi - this.token.get("rotation"));
            let arcs = []; //as may straddle 2 arcs
            if (phi >= 330 || phi <= 30) {
                arcs.push(1);
            }
            if (phi >= 30 && phi <= 90) {
                arcs.push(2);
            }
            if (phi >= 90 && phi <= 150) {
                arcs.push(3);
            }
            if (phi >= 150 && phi <= 210) {
                arcs.push(4);
            }
            if (phi >= 210 && phi <= 270) {
                arcs.push(5);
            }
            if (phi >= 270 && phi <= 330) {
                arcs.push(6);
            }
            return arcs;
        }

        Damage(damage) {
            let shields = parseInt(this.token.get("bar2_value"));
            let shieldsMax = parseInt(this.token.get("bar2_max"));
            let shieldDamage = 0;
            if (shields > 0) {
                if (shields > Math.floor(shieldsMax/2)) {
                    shieldDamage = Math.min(shields,damage);
                } else {
                    outputCard.body.push("Shields are Buckling!");
                    shieldDamage = Math.min(shields,Math.round(damage/2));
                }
            }
            let hullDamage = Math.max(0,(damage - shieldDamage));

            if (shieldDamage > 0 && hullDamage === 0) {
                outputCard.body.push("Shields Absorb all the Damage");
            }
            if (shieldDamage > 0 && hullDamage > 0) {
                outputCard.body.push("Shields Absorb " + shieldDamage + " Damage");
                outputCard.body.push("The remaining " + hullDamage + " Damage is on the Hull");
            }
            if (shieldDamage === 0) {
                outputCard.body.push("All the Damage is taken on the Hull")
            }

            shields = shields - shieldDamage;
            this.token.set("bar2_value",shields);
            this.shields = shields;
            let shieldstatus = "#00ff00";
            let shieldPercent = Math.round(shields/shieldsMax * 100);
            if (shieldPercent <= 75) {shieldstatus = "#ffff00"};
            if (shieldPercent <= 50) {shieldstatus = "#FFA500"};
            if (shieldPercent <= 25) {shieldstatus = "#ff0000"};
            if (shieldPercent === 0) {
                outputCard.body.push("Shields are Down!");
                shieldstatus = "transparent";
            };
            this.token.set("aura1_color",shieldstatus);
            if (hullDamage > 0) {
                this.HullDamage(hullDamage);
            }
        }

        HullDamage(damage) {
            let startingHull = parseInt(this.token.get("bar1_value"));
            let hullMax = parseInt(this.token.get("bar1_max"));
            let hull = Math.max(0,(startingHull - damage));
            this.hull = hull;
            if (hull > 0) {
                let levels = 4;
                if (Attribute(this.charID,"advancedhull") === 1) {
                    levels = 3;
                }
                let startingLevel = levels - Math.ceil(startingHull/hullMax * levels);
log("Starting Level: : " + startingLevel)
                let finishLevel = levels - Math.ceil(hull/hullMax * levels);
log("Finish Level: " + finishLevel)

                let delta = finishLevel - startingLevel;



                this.token.set("bar1_value",hull);

                let crew = parseInt(Attribute(this.charID,"crew"));
log("Crew: " + crew)
                let crewMax = parseInt(Attribute(this.charID,"crew",true));
log("CrewMax: " + crewMax)
                let newCrew = Math.ceil(hull/hullMax * crewMax);
log("new Crew: " +newCrew)
                let casualties = crew - newCrew;
                if (casualties > 0) {
                    let noun = ["some","heavy","massive"];
                    outputCard.body.push("There were "+ noun[Math.min((casualties - 1),2)] + " casualties to the crew");
                    AttributeSet(this.charID,"crew",newCrew);
                }
                if (delta > 0) {
                    this.ThresholdDamage(startingLevel,finishLevel);
                }





            } else {
                this.Destroyed("Damaged");
            }
        }

        ThresholdDamage(startingLevel,finishLevel) {
            let damagedSystems = Attribute(this.charID,"damagedsystems");
            let needed = finishLevel + (finishLevel - 1 - startingLevel);
log("Needed for TD: " + needed);
            let roll, roll2;




            //command
            roll = randomInteger(6);
            roll2 = randomInteger(6);
            let command = Attribute(this.charID,"command");
            if (roll < needed && command === "Nominal") {
                if (roll2 === 6) {
                    outputCard.body.push("The Command Bridge was Destroyed!");
                    outputCard.body.push("The Ship is Out of Control until this is Repaired");
                    this.token.set(SM.ooc,true);
                    AttributeSet(this.charID,"command","Destroyed");
                } else {
                    outputCard.body.push("The Command Bridge was Damaged!");
                    outputCard.body.push("The Ship is Out of Control for " + roll2 + " turns or until Repaired");
                    this.token.set(SM.ooc,roll2);
                    AttributeSet(this.charID,"command","Damaged");
                }
            }
            //lifesupport
            let lifesupport = Attribute(this.charID,"lifesupport");
            roll = randomInteger(6);
            roll2 = randomInteger(6);
            if (roll < needed && lifesupport === "Nominal") {
                outputCard.body.push("Lifesupport was hit, and will fail in " + roll2 + " turns")
                outputCard.body.push("If not repaired before then, the crew will abandon ship");    
                AttributeSet(this.charID,"lifesupport","Failing");
                this.token.set(SM.nolife,roll2);
            }
            //warpcore
            roll = randomInteger(6);
            roll2 = randomInteger(6);
            let warpcore = Attribute(this.charID,"warpcore");
            if (roll < needed && warpcore === "Nominal") {
                if (roll2 === 6) {
                    outputCard.body.push("The Warp Core was damaged and went Critical!");
                    this.Destroyed("WarpCore");
                    return;
                } else if (roll2 === 5) {
                    outputCard.body.push("The Warp Core was damaged but the Chief Engineer was able to Jettison it before it went Critical");
                    outputCard.body.push("The Ship will drift, unable to take part in the rest of the battle");
                    AttributeSet(this.charID,"warpcore","Gone");
                    this.token.set(SM.nopower,true);
                } else {
                    outputCard.body.push("The Warp Core was damaged");
                    outputCard.body.push("If not repaired, there is an increasing chance each turn it will go critical and explode");
                    AttributeSet(this.charID,"warpcore","Damaged");
                    this.token.set(SM.warp,1);
                }
            }

            //impulse
            let impulse = Attribute(this.charID,"impulse");
            if (impulse !== "Offline") {
                let roll = randomInteger(6);
                let result = "Damaged";
                if (roll <= needed) {
                    if (impulse === "Damaged") {
                        result = "Offline";
                    } 
                    AttributeSet(this.charID,"impulse",result);
                    outputCard.body.push("Impulse Engines were Hit and are now " + result);
                    if (result === "Offline") {
                        outputCard.body.push("The Ship will Drift until repaired");
                        this.token.set(SM.nopower,true);
                    } else {
                        outputCard.body.push("Thrusters and Turn are Halved");
                    }
                }
            }


            //systems with #s
            let systems = {
                "Shield Generator": "shieldgenerator",
                "Fire Control": "firecontrol",

            }
            let keys = Object.keys(systems);
            for (let i=0;i<keys.length;i++) {
                let system = keys[i];
                let attribute = systems[system];
                let current = parseInt(Attribute(this.charID,attribute));
                if (current > 0) {
                    current--;
                    roll = randomInteger(6);
                    if (roll <= needed) {
                        AttributeSet(this.charID,attribute,current);
                        outputCard.body.push("A " + system + " has been Damaged");
                        if (current === 0) {
                            if (system === "Shield Generator") {
                                outputCard.body.push("Shields are now Offline");
                                AttributeSet(this.charID,"shields",0);
                                this.token.set("bar2_value",0);
                                this.token.set("aura1_color","transparent");
                            }
                            if (system === "Fire Control") {
                                outputCard.body.push("Weapons cannot fire");
                            }
                        }
                    }
                }
            }
            
            //systems with Nominal vs Offline
            systems = {
                "Sensors": "sensors",
                "Warp Drive": "warpdrive",
            }
            let keys = Object.keys(systems);
            for (let i=0;i<keys.length;i++) {
                let system = keys[i];
                let attribute = systems[system];
                let current = parseInt(Attribute(this.charID,attribute));
                if (current === "Nominal") {
                    roll = randomInteger(6);
                    if (roll <= needed) {
                        AttributeSet(this.charID,attribute,"Offline");
                        outputCard.body.push(system + " have been Damaged and knocked Offline");
                    }
                }
            }


            //Weapons
            for (let i=0;i<this.weaponArray.length;i++) {
                let weapon = this.weaponArray[i];
                let status = Attribute(this.charID,"weapon" + weapon.number + "status");
                let roll = randomInteger(6);
                if (roll <= needed && status === "Normal") {
                    let title = weaponName + " " + weaponType;
                    outputCard.body.push(title + " is Offline");
                    weapon.status = "Damaged";
                    AttributeSet("weapon" + weapon.number + "status","Damaged");
                    damagedsystems.push(weaponName + " " + weaponType);
                }
            }







        }







        Distance(b) {
            return HexMap[this.hexLabel].distance(HexMap[b.hexLabel]);
        }




    }







    summonToken = function(cID,left,top,size = 70,rotation = 0,layer = "map") {
        let character = getObj("character", cID);
        if (!character) {
            sendChat("","No Character")
            return
        }
        let newToken;
        character.get('defaulttoken',function(defaulttoken){
            const dt = JSON.parse(defaulttoken);
            let img = dt.imgsrc;
            img = tokenImage(img);
            if(dt && img){
                dt.imgsrc=img;
                dt.left=left;
                dt.top=top;
                dt.rotation = rotation;
                dt.pageid = pageInfo.page.get('id');
                dt.layer = layer;
                dt.width = size * 1.186;
                dt.height = size;
                newToken = createObj("graphic", dt);
            } else {
                sendChat('','/w gm Cannot create token for <b>'+character.get('name')+'</b>');
            }
        });
        return newToken;
    }



    const AddAbility = (abilityName,action,characterID) => {
        let newObj = createObj("ability", {
            name: abilityName,
            characterid: characterID,
            action: action,
            istokenaction: true,
        })
        if (newObj) {return newObj.id};
    }    


    const AddAbilities = (msg) => {
        if (!msg.selected) {return};
        let id = msg.selected[0]._id;
        let ship = ShipArray[id];  
        if (!ship) {
            ship = new Ship(id);
        }
        AddAbilities2(ship)
    }
        
    const AddAbilities2 = (ship) => {
        let abilityName,action;
        let abilArray = findObjs({_type: "ability", _characterid: ship.charID});
        //clear old abilities
        for(let a=0;a<abilArray.length;a++) {
            abilArray[a].remove();
        } 
        //Weapon Types
        let types = [];
        _.each(ship.weaponArray, weapon => {
            if (types.includes(weapon.type) === false) {
                types.push(weapon.type);
            }
        })
        _.each(types,type => {
            let abilityName = "Fire: " + type + "s";
            let action = "!Fire;@{selected|token_id};@{target|token_id};" + type;
            AddAbility(abilityName,action,ship.charID);
        })



    }


    const InlineButtons = (array) => {
        let output = "";
        for (let i=0;i<array.length;i++) {
            let info = array[i];
            let inline = true;
            if (i>0 && inline === false) {
                output += '<hr style="width:95%; align:center; margin:0px 0px 5px 5px; border-top:2px solid $1;">';
            }
            let out = "";
            let borderColour = Factions[outputCard.side].borderColour;
            if (inline === false || i===0) {
                out += `<div style="display: table-row; background: #FFFFFF;; ">`;
                out += `<div style="display: table-cell; padding: 0px 0px; font-family: Arial; font-style: normal; font-weight: normal; font-size: 14px; `;
                out += `"><span style="line-height: normal; color: #000000; `;
                out += `"> <div style='text-align: center; display:block;'>`;
            }
            if (inline === true) {
                out += '<span>     </span>';
            }
            out += `<a style ="background-color: ` + Factions[outputCard.side].backgroundColour + `; padding: 5px;`
            out += `color: ` + Factions[outputCard.side].fontColour + `; text-align: center; vertical-align: middle; border-radius: 5px;`;
            out += `border-color: ` + borderColour + `; font-family: Tahoma; font-size: x-small; `;
            out += `"href = "` + info.action + `">` + info.phrase + `</a>`
            
            if (inline === false || i === (array.length - 1)) {
                out += `</div></span></div></div>`;
            }
            output += out;
        }
        return output;
    }

    const ButtonInfo = (phrase,action,inline = false) => {
        //inline - has to be true in any buttons to have them in same line -  starting one to ending one
        let info = {
            phrase: phrase,
            action: action,
            inline: inline,
        }
        outputCard.buttons.push(info);
    };

    const SetupCard = (title,subtitle,side) => {
        outputCard.title = title;
        outputCard.subtitle = subtitle;
        outputCard.side = side;
        outputCard.body = [];
        outputCard.buttons = [];
        outputCard.inline = [];
    };

    const DisplayDice = (roll,faction,size) => {
        roll = roll.toString();
        tablename = (!Factions[faction]) ? "Neutral":Factions[faction].dice
        let table = findObjs({type:'rollabletable', name: tablename})[0];
        let obj = findObjs({type:'tableitem', _rollabletableid: table.id, name: roll })[0];   
        if (!obj) {return "NA"}
        let avatar = obj.get('avatar');
        let out = "<img width = "+ size + " height = " + size + " src=" + avatar + "></img>";
        return out;
    };

    const PrintCard = (id) => {
        let output = "";
        if (id) {
            let playerObj = findObjs({type: 'player',id: id})[0];
            let who = playerObj.get("displayname");
            output += `/w "${who}"`;
        } else {
            output += "/desc ";
        }

        if (!outputCard.side || !Factions[outputCard.side]) {
            outputCard.side = "Neutral";
        }

        //start of card
        output += `<div style="display: table; border: ` + Factions[outputCard.side].borderStyle + " " + Factions[outputCard.side].borderColour + `; `;
        output += `background-color: #EEEEEE; width: 100%; text-align: center; `;
        output += `border-radius: 1px; border-collapse: separate; box-shadow: 5px 3px 3px 0px #aaa;;`;
        output += `"><div style="display: table-header-group; `;
        output += `background-color: ` + Factions[outputCard.side].backgroundColour + `; `;
        output += `background-image: url(` + Factions[outputCard.side].image + `), url(` + Factions[outputCard.side].image + `); `;
        output += `background-position: left,right; background-repeat: no-repeat, no-repeat; background-size: contain, contain; align: center,center; `;
        output += `border-bottom: 2px solid #444444; "><div style="display: table-row;"><div style="display: table-cell; padding: 2px 2px; text-align: center;"><span style="`;
        output += `font-family: ` + Factions[outputCard.side].titlefont + `; `;
        output += `font-style: normal; `;

        let titlefontsize = "1.4em";
        if (outputCard.title.length > 12) {
            titlefontsize = "1em";
        }

        output += `font-size: ` + titlefontsize + `; `;
        output += `line-height: 1.2em; font-weight: strong; `;
        output += `color: ` + Factions[outputCard.side].fontColour + `; `;
        output += `text-shadow: none; `;
        output += `">`+ outputCard.title + `</span><br /><span style="`;
        output += `font-family: Arial; font-variant: normal; font-size: 13px; font-style: normal; font-weight: bold; `;
        output += `color: ` +  Factions[outputCard.side].fontColour + `; `;
        output += `">` + outputCard.subtitle + `</span></div></div></div>`;

        //body of card
        output += `<div style="display: table-row-group; ">`;

        let inline = 0;

        for (let i=0;i<outputCard.body.length;i++) {
            let out = "";
            let line = outputCard.body[i];
            if (!line || line === "") {continue};
            if (line.includes("[INLINE")) {
                let end = line.indexOf("]");
                let substring = line.substring(0,end+1);
                let num = substring.replace(/[^\d]/g,"");
                if (!num) {num = 1};
                line = line.replace(substring,"");
                out += `<div style="display: table-row; background: #FFFFFF;; `;
                out += `"><div style="display: table-cell; padding: 0px 0px; font-family: Arial; font-style: normal; font-weight: normal; font-size: 14px; `;
                out += `"><span style="line-height: normal; color: #000000; `;
                out += `"> <div style='text-align: center; display:block;'>`;
                out += line + " ";

                for (let q=0;q<num;q++) {
                    let info = outputCard.inline[inline];
                    out += `<a style ="background-color: ` + Factions[outputCard.side].backgroundColour + `; padding: 5px;`
                    out += `color: ` + Factions[outputCard.side].fontColour + `; text-align: center; vertical-align: middle; border-radius: 5px;`;
                    out += `border-color: ` + Factions[outputCard.side].borderColour + `; font-family: Tahoma; font-size: x-small; `;
                    out += `"href = "` + info.action + `">` + info.phrase + `</a>`;
                    inline++;                    
                }
                out += `</div></span></div></div>`;
            } else {
                line = line.replace(/\[hr(.*?)\]/gi, '<hr style="width:95%; align:center; margin:0px 0px 5px 5px; border-top:2px solid $1;">');
                line = line.replace(/\[\#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})\](.*?)\[\/[\#]\]/g, "<span style='color: #$1;'>$2</span>"); // [#xxx] or [#xxxx]...[/#] for color codes. xxx is a 3-digit hex code
                line = line.replace(/\[[Uu]\](.*?)\[\/[Uu]\]/g, "<u>$1</u>"); // [U]...[/u] for underline
                line = line.replace(/\[[Bb]\](.*?)\[\/[Bb]\]/g, "<b>$1</b>"); // [B]...[/B] for bolding
                line = line.replace(/\[[Ii]\](.*?)\[\/[Ii]\]/g, "<i>$1</i>"); // [I]...[/I] for italics
                let lineBack,fontcolour;
                if (line.includes("[F]")) {
                    let ind1 = line.indexOf("[F]") + 3;
                    let ind2 = line.indexOf("[/f]");
                    let fac = line.substring(ind1,ind2);
                    if (Factions[fac]) {
                        lineBack = Factions[fac].backgroundColour;
                        fontcolour = Factions[fac].fontColour;
                    }
                    line = line.replace("[F]" + fac + "[/f]","");

                } else {
                    lineBack = (i % 2 === 0) ? "#D3D3D3": "#EEEEEE";
                    fontcolour = "#000000";
                }
                out += `<div style="display: table-row; background: ` + lineBack + `;; `;
                out += `"><div style="display: table-cell; padding: 0px 0px; font-family: Arial; font-style: normal; font-weight: normal; font-size: 14px; `;
                out += `"><span style="line-height: normal; color:` + fontcolour + `; `;
                out += `"> <div style='text-align: center; display:block;'>`;
                out += line + `</div></span></div></div>`;                
            }
            output += out;
        }

        //buttons
        if (outputCard.buttons.length > 0) {
            for (let i=0;i<outputCard.buttons.length;i++) {
                let info = outputCard.buttons[i];
                let inline = info.inline;
                if (i>0 && inline === false) {
                    output += '<hr style="width:95%; align:center; margin:0px 0px 5px 5px; border-top:2px solid $1;">';
                }
                let out = "";
                let borderColour = Factions[outputCard.side].borderColour;
                
                if (inline === false || i===0) {
                    out += `<div style="display: table-row; background: #FFFFFF;; ">`;
                    out += `<div style="display: table-cell; padding: 0px 0px; font-family: Arial; font-style: normal; font-weight: normal; font-size: 14px; `;
                    out += `"><span style="line-height: normal; color: #000000; `;
                    out += `"> <div style='text-align: center; display:block;'>`;
                }
                if (inline === true) {
                    out += '<span>     </span>';
                }
                out += `<a style ="background-color: ` + Factions[outputCard.side].backgroundColour + `; padding: 5px;`
                out += `color: ` + Factions[outputCard.side].fontColour + `; text-align: center; vertical-align: middle; border-radius: 5px;`;
                out += `border-color: ` + borderColour + `; font-family: Tahoma; font-size: x-small; `;
                out += `"href = "` + info.action + `">` + info.phrase + `</a>`
                
                if (inline === false || i === (outputCard.buttons.length - 1)) {
                    out += `</div></span></div></div>`;
                }
                output += out;
            }

        }

        output += `</div></div><br />`;
        sendChat("",output);
        outputCard = {title: "",subtitle: "",side: "",body: [],buttons: [],};
    }

    //related to building hex map
    const LoadPage = () => {
        //build Page Info and flesh out Hex Info
        pageInfo.page = getObj('page', Campaign().get("playerpageid"));
        pageInfo.name = pageInfo.page.get("name");
        pageInfo.scale = pageInfo.page.get("snapping_increment");
        pageInfo.width = pageInfo.page.get("width") * 70;
        pageInfo.height = pageInfo.page.get("height") * 70;
        pageInfo.type = pageInfo.page.get("grid_type");

    }

    const BuildMap = () => {
        let startTime = Date.now();
        HexMap = {};

        let startX = HexInfo.pixelStart.x;
        let startY = HexInfo.pixelStart.y;
        let halfToggleX = HexInfo.halfToggleX;
        let halfToggleY = HexInfo.halfToggleY;
        if (pageInfo.type === "hex") {
            for (let j = startY; j <= pageInfo.height;j+=HexInfo.ySpacing){
                for (let i = startX;i<= pageInfo.width;i+=HexInfo.xSpacing) {
                    let point = new Point(i,j);     
                    let hex = new Hex(point);
                }
                startX += halfToggleX;
                halfToggleX = -halfToggleX;
            }
        } else if (pageInfo.type === "hexr") {
            for (let i=startX;i<=pageInfo.width;i+=HexInfo.xSpacing) {
                for (let j=startY;j<=pageInfo.height;j+=HexInfo.ySpacing) {
                    let point = new Point(i,j);     
                    let hex = new Hex(point);
                }
                startY += halfToggleY;
                halfToggleY = -halfToggleY;
            }
        }
        //AddTerrain();    
        AddTokens();
        let elapsed = Date.now()-startTime;
        log("Hex Map Built in " + elapsed/1000 + " seconds");
    };

     
    const AddTokens = () => {
        ShipArray = {};
        //create an array of all tokens
        let start = Date.now();
        let tokens = findObjs({
            _pageid: Campaign().get("playerpageid"),
            _type: "graphic",
            _subtype: "token",
            layer: "objects",
        });

        let c = tokens.length;
        let s = (c===1) ? '':'s';    
        
        tokens.forEach((token) => {
            let character = getObj("character", token.get("represents"));   
            if (character) {
                let ship = new Ship(token.get("id"));
            }
        });

        let elapsed = Date.now()-start;
        log(`${c} token${s} checked in ${elapsed/1000} seconds - ` + Object.keys(ShipArray).length + " placed in Ship Array");

    }



    const stringGen = () => {
        let text = "";
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 6; i++) {
            text += possible.charAt(Math.floor(randomInteger(possible.length)));
        }
        return text;
    };




    const StartGame = () => {
  

    }

    
    




    const SetupGame = (msg) => {
        
    }




  


    const Activate = (msg) => {
        
    }


    const RemoveLines2 = () => {
            RemoveLines()
    }


    const RemoveLines = (which = ["LOS","Deploy"]) => {
        _.each(which,lines => {
            let array;
            if (lines === "LOS") {
                array = state.FullThrust.losLines;
            }
            if (lines === "Deploy") {
                array = state.FullThrust.deployLines;
            }
            if (array) {
                for (let i=0;i<array.length;i++) {
                    let id = array[i];
                    let path = findObjs({_type: "pathv2", id: id})[0];
                    if (path) {
                        path.remove();
                    }
                }
                array = [];
            }
        })
    }


    const DrawLine = (set,colour = "#ff0000",type = "Deploy") => {
        let a = set[0],b = set[1];
        //define centre, then a and b change into points
        let left = Math.min(a[0],b[0]);
        let bottom = Math.min(a[1],b[1]);
        let x = Math.abs(a[0] - b[0])/2 + left;
        let y = Math.abs(a[1] - b[1])/2 + bottom;
        let points = [];
        points.push([a[0] - left,a[1] - bottom]);
        points.push([b[0] - left,b[1] - bottom]);
        points = JSON.stringify(points);

        let layer = (type === "LOS") ? "map":"map";

        let page = getObj('page',Campaign().get('playerpageid'));
        if(page) {
            let line = createObj('pathv2',{
                layer: layer,
                pageid: page.id,
                shape: "pol",
                stroke: colour,
                stroke_width: 7,
                x: x,
                y: y,
                points: points,
            });
            if (line) {
                toFront(line);
                if (type === "LOS") {
                    state.FullThrust.losLines.push(line.get("id"))
                } else {
                    state.FullThrust.deployLines.push(line.get("id"));
                }
            }
        }
    }






    const SetFleets = () => {
        AddTokens();
        _.each(ShipArray,ship => {
            if (ship.type === "Asteroid") {
                //randomize direction


            } 
            if (ship.type === "Starship") {

                //bars on token
                ship.hull = ship.hullMax;
                AttributeSet(ship.charID,"hull",ship.hull);

                let shieldType = Attribute(ship.charID,"shieldtype");
                if (!shieldType) {
                    shieldType === "Normal"
                    AttributeSet(ship.charID,"shieldtype",shieldType);
                };
                let shieldNum = 3
                if (shieldType === "Inferior") {shieldNum = 4};
                if (shieldType === "Advanced") {shieldNum = 2};
                let mass = parseInt(Attribute(ship.charID,"mass"));

                let shieldsMax = Math.floor(mass/shieldNum);

                let shieldGenerators = Attribute(ship.charID,"shieldgenerators",true);
                if (!shieldGenerators) {
                    shieldGenerators = 1;
                    AttributeSet(ship.charID,"shieldgenerators",shieldGenerators,true)
                }
                shieldGenerators = parseInt(shieldGenerators);
                if (shieldGenerators === 0) {
                    shieldsMax = 0;
                }

                ship.shields = shieldsMax;
                ship.shieldsMax = shieldsMax;

                AttributeSet(ship.charID,"shieldgenerators",shieldGenerators);
                AttributeSet(ship.charID,"shields",shieldsMax);
                AttributeSet(ship.charID,"shields",shieldsMax,true);
                let shieldColour = "#00ff00";
                if (shieldsMax === 0) {
                    shieldColour = "transparent";
                }
            

                //uses Attributes only
                let nominalAttributes = ["command","lifesupport","warpcore","sensors","impulse","warpdrive"]
                for (let i=0;i<nominalAttributes.length;i++) {
                    AttributeSet(ship.charID,nominalAttributes[i],"Nominal");
                }


                let fc = Attribute(ship.charID,"firecontrol",true);
                if (!fc) {
                    fc = 1;
                    AttributeSet(ship.charID,"firecontrol",fc,true);
                }
                fc = parseInt(fc);
                AttributeSet(ship.charID,"firecontrol",fc);

                let crew = Math.ceil(parseInt(Attribute(ship.charID,"mass"))/20);
                AttributeSet(ship.charID,"crew",crew);
                AttributeSet(ship.charID,"crew",crew,true);

                AttributeSet(ship.charID,"damagedsystems","");

                let hullID = AttributeID(ship.charID,"hull");
                let shieldID = AttributeID(ship.charID,"shields");

                ship.token.set({
                    bar1_value: ship.hull,
                    bar1_max: ship.hullMax,
                    bar1_link: hullID,

                    bar2_value: shieldsMax,
                    bar2_max: shieldsMax,
                    bar2_link: shieldID,

                    showplayers_bar1: true,
                    showplayers_bar2: true,
                    aura1_color: shieldColour,
                    aura1_radius: 0.25,
                    showplayers_aura1: true,
                    showplayers_name: true,
                    statusmarkers: "",
                    tint_color: "transparent",
                })

                for (let i=0;i<ship.weaponArray.length;i++) {
                    ship.weaponArray[i].status = "Normal";
                    AttributeSet(ship.charID,"weapon" + (i+1) + "status","Normal");
                }

                AddAbilities2(ship);

            }

        });




        sendChat("","Fleets Added")


    }


    const Fire = (msg) => {
        let Tag = msg.content.split(";");
        let shooter = ShipArray[Tag[1]];
        let target = ShipArray[Tag[2]];
        let weaponType = Tag[3];

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

        SetupCard(shooter.name,target.name,shooter.faction);

        let losResult = LOS(shooter,target);
        let errorMsg = [];
        if (losResult.los === false) {
            errorMsg.push("No LOS - " + losResult.losReason);
        }
        let shooterArcs = losResult.shooterArcs;

        let weaponNum = 0;

        for (let i=0;i<shooter.weaponArray.length;i++) {
            let weapon = shooter.weaponArray[i];
            let type = weapon.type;
            let facing = weapon.facing; //will be an array of facing #s
            let inArc = facing.some(item => shooterArcs.includes(item));
            if (losResult.distance <= weapon.maxRange && inArc === true && weaponType === type) {
                weaponNum++;
            }
        }


        let s = (weaponNum === 1) ? "":"s";
        let s2 = (weaponNum === 1) ? "s":"";

        if (weaponNum === 0) {
            errorMsg.push("No Weapons of this Class with Range/Arc/Power");
        }

        if (ErrorMsg(errorMsg)) {
            PrintCard();
            return;
        }


        outputCard.body.push(weaponNum + " " + weaponType + s + " fire" + s2 + " at the Target");
        let totalDamage = 0;
        let hits = 0;
        let weaponTip = "";

        if (Projectiles.includes(weaponType)) {
            //roll to hit, then damage
            let toHit = 2;
            if (losResult.distance > 6) {toHit = 3};
            if (losResult.distance > 9) {toHit = 4};
            if (losResult.distance > 12) {toHit = 5};
            for (let w=1;w<=weaponNum;w++) {
                let roll = randomInteger(6);
                let weaponDamage = 0;
                let damageRolls = [];
                if (roll >= toHit) {   
                    hits++;            
                    if (weaponType === "Pulse Torpedo") {
                        damageRolls.push(randomInteger(6));
                    }
                    if (weaponType === "Photon Torpedo") {
                        damageRolls.push(randomInteger(6));
                        damageRolls.push(randomInteger(6));
                    }
                    damageRolls.sort().reverse();
                    weaponDamage = damageRolls[0];
                }
                weaponTip += w + ": " + roll + " vs. " + toHit + "+ To Hit<br>";
                if (weaponDamage > 0) {
                    weaponTip += "Damage: " + weaponDamage + " [" + damageRolls.toString() + "]";
                }
                totalDamage += weaponDamage;
            }

            let pt1 = HexMap[shooter.hexLabel].centre;
            let pt2 = HexMap[target.hexLabel].centre;
            spawnFxBetweenPoints(pt1, pt2,"missile-fire",Campaign().get("playerpageid"));
        } else {
            //phasers, disruptors
            let diceArray = {
                "Class 1 Phaser": [1,1],
                "Class 2 Phaser": [2,2,1,1],
                "Class 3 Phaser": [3,3,2,2,1,1],
                "Disruptor": [3,2,1],
                "Disruptor Mk.2": [4,3,2,1],
            }
            let interval = Math.max(0,Math.ceil(losResult.distance / 3) - 1);
            dice = diceArray[weaponType][interval];
            let baseDamage = (weaponType.includes("Phaser")) ? 1:2;

            for (let w=1;w<=weaponNum;w++) {
                let rolls = [];
                let weaponDamage = 0;
                for (let i=0;i<dice;i++) {
                    let roll = randomInteger(6);
                    if (roll < 4) {
                        rolls.push(roll);
                    } else if (roll > 3 && roll < 6) {
                        hits++;
                        weaponDamage += baseDamage;
                        rolls.push(roll);
                    } else if (roll === 6) {
                        hits++
                        weaponDamage += (baseDamage * 2);
                        if (weaponType.includes("Phaser")) {
                            let extraRoll;
                            do {
                                extraRoll = randomInteger(6);
                                if (extraRoll > 3 && extraRoll < 6) {
                                    roll += "/" + extraRoll;
                                    weaponDamage++;
                                } else if (extraRoll === 6) {
                                    weaponDamage += 2;
                                    roll += "/6";
                                }
                            } while (extraRoll === 6);
                        }
                        rolls.push(roll);
                    }
                }
                weaponTip += w + ": " + rolls.toString() + " vs. 4+ To Hit<br>";
                if (weaponDamage > 0) {
                    weaponTip += "Damage: " + weaponDamage + "<br>";
                }                
                totalDamage += weaponDamage;
                let fxObj =  findObjs({type: "custfx", name: "Beam2"})[0];
                let pt1 = HexMap[shooter.hexLabel].centre;
                let pt2 = HexMap[target.hexLabel].centre;
                spawnFxBetweenPoints(pt1, pt2, fxObj.get("id"),Campaign().get("playerpageid"));
            }








        }

        if (hits > 0) {
            weaponTip = '[' + hits + '](#" class="showtip" title="' + weaponTip + ')';
            let s = (hits === 1) ? "":"s";
            outputCard.body.push(weaponTip + " hit" + s + ", doing " + totalDamage + " Damage");
            target.Damage(totalDamage);
        } else {
            weaponTip = '[No Hits](#" class="showtip" title="' + weaponTip + ')';
            let s = (weaponNum === 1) ? "":"s";
            outputCard.body.push(weaponTip + " with " + weaponType + s)
        }

        PrintCard();

    }





    const TokenInfo = (msg) => {
        let Tag = msg.content.split(";");
        let id = Tag[1];
        let ship = ShipArray[id];
        if (!ship) {
            sendChat("","Not in Array");
            return;
        };
        let label = ship.hexLabel;
        let hex = HexMap[label];
        SetupCard(ship.name,"Info",ship.faction);
        outputCard.body.push("Hex Label: " + label);


        PrintCard();
    }

    const RollDice = (msg) => {
        PlaySound("Dice");
        let roll = randomInteger(6);
        let playerID = msg.playerid;
        let id,ship,player;
        if (msg.selected) {
            id = msg.selected[0]._id;
        }
        let faction = "Neutral";

        if (!id && !playerID) {
            return;
        }
        if (id) {
            ship = ShipArray[id];
            if (ship) {
                faction = ship.faction;
                player = ship.player;
            }
        }
        if ((!id || !ship) && playerID) {
            faction = state.FullThrust.players[playerID];
            player = (state.FullThrust.factions[0] === faction) ? 0:1;
        }

        if (!state.FullThrust.players[playerID] || state.FullThrust.players[playerID] === undefined) {
            if (faction !== "Neutral") {    
                state.FullThrust.players[playerID] = faction;
            } else {
                sendChat("","Click on one of your tokens then select Roll again");
                return;
            }
        } 
        let res = "/direct " + DisplayDice(roll,faction,40);
        sendChat("player|" + playerID,res);
    }





    const ClearState = (msg) => {
        let Tag = msg.content.split(";");
        let tokens;
        LoadPage();
        //RemoveLines(["Deploy","LOS"]);
        //RemoveDead();
        if (Tag[1] && Tag[1] === "All") {
            tokens = findObjs({
                _pageid: Campaign().get("playerpageid"),
                _type: "graphic",
                _subtype: "token",
                layer: "objects",
            });
            _.each(tokens,token => token.remove());
            tokens = findObjs({
                _pageid: Campaign().get("playerpageid"),
                _type: "graphic",
                _subtype: "token",
                layer: "foreground",
            });
            _.each(tokens,token => token.remove());
        }

        BuildMap();

        //clear arrays
        ShipArray = {};

        state.FullThrust = {
            playerIDs: [],
            players: {},
            factions: [],
            turn: 1,
            losLines: [],
            phase: 0,

        }

        





        sendChat("","Cleared State/Arrays");
    }


    const RemoveDead = () => {
        let tokens = findObjs({_pageid: Campaign().get("playerpageid"),_type: "graphic",_subtype: "token",layer: "map",});
        _.each(tokens,token => {
            if (token.get("status_dead") === true) {
                token.remove();
            }
        })
    }



    //line line collision where line1 is pt1 and 2, line2 is pt 3 and 4
    const lineLine = (pt1,pt2,pt3,pt4) => {
        //calculate the direction of the lines
        uA = ( ((pt4.x-pt3.x)*(pt1.y-pt3.y)) - ((pt4.y-pt3.y)*(pt1.x-pt3.x)) ) / ( ((pt4.y-pt3.y)*(pt2.x-pt1.x)) - ((pt4.x-pt3.x)*(pt2.y-pt1.y)) );
        uB = ( ((pt2.x-pt1.x)*(pt1.y-pt3.y)) - ((pt2.y-pt1.y)*(pt1.x-pt3.x)) ) / ( ((pt4.y-pt3.y)*(pt2.x-pt1.x)) - ((pt4.x-pt3.x)*(pt2.y-pt1.y)) );
        if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
            intersection = {
                x: (pt1.x + (uA * (pt2.x-pt1.x))),
                y: (pt1.y + (uA * (pt2.y-pt1.y)))
            }
            return intersection;
        }
        return;
    }

    const NextTurn = () => {






    }




   

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
        SetupCard(shooter.name,"LOS",shooter.faction);

        let losResult = LOS(shooter,target);
    
        outputCard.body.push("Distance: " + losResult.distance + " Hexes");
        if (losResult.los === false) {
            outputCard.body.push("[#ff0000]No LOS[/#]");
            outputCard.body.push(losResult.losReason);
        } else {
            outputCard.body.push("[#0000ff]There is LOS[/#]");
            outputCard.body.push("[hr]");
            let shooterArcs = losResult.shooterArcs;
            let arcs = shooterArcs.map((e) => ArcNames[e]);
            arcs = arcs.toString().replace(","," & ");
            let s = (shooterArcs.length === 1) ? "":"s";
            outputCard.body.push("The Target is in the " + arcs + " Arc" +s);
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
                    outputCard.body.push(number + " " + type + s + verb + "Range/Arc");
                }
            }

        }

        
        PrintCard();
    }




    const LOS = (shooter,target) => {
        let notes = [];
        let shooterHex = HexMap[shooter.hexLabel];
        let targetHex = HexMap[target.hexLabel];
        let distance = shooter.Distance(target);
      
        let finalLOS = true;
        let hexCover = false;
        let finalLOSReason = "";
 
        let interCubes = [shooterHex.cube.linedraw(targetHex.cube),shooterHex.cube.linedraw2(targetHex.cube)];
        let labels = [interCubes[0].map((e)=> e.label()), interCubes[1].map((e)=> e.label())];

        let len = labels[0].length;
        let los = [true,true];
        let losReason = ["",""];
        for (let side=0;side<2;side++) {
            for (let i=0;i<len;i++) {
                let interHex = HexMap[labels[side][i]];
                if (interHex.terrain !== "Empty Space") {
                    los[side] = false;
                    losReason[side] = interHex.terrain;
                    break;
                }
            }
        }

        if (los[0] === false && los[1] === false) {
            finalLOS = false;
            finalLOSReason = losReason[0];
            if (losReason[0] !== losReason[1]) {
                finalLOSReason += " / " + losReason[1];
            }
            finalLOSReason = "Blocked by " + finalLOSReason;
        }


        let result = {
            los: finalLOS,
            losReason: finalLOSReason,
            distance: distance,
            shooterArcs: shooter.Arcs(target),
            targetArcs: target.Arcs(shooter),
        }

        return result;
    }


    const ErrorMsg = (msgs) => {
        if (msgs.length === 0) {return false};
        _.each(msgs,msg => {
            outputCard.body.push(msg);
        })
        return true;
    }






    const changeGraphic = (tok,prev) => {
        let ship = ShipArray[tok.id];
        let newLabel = new Point(tok.get("left"),tok.get("top")).toCube().label();
        let prevLabel = new Point(prev.left,prev.top).toCube().label();
        if (ship && newLabel !== prevLabel) {
            log(ship.name + " moving")
            let index = HexMap[prevLabel].tokenIDs.indexOf(tok.id);
            if (index > -1) {
                HexMap[prevLabel].tokenIDs.splice(index,1);
            }
            HexMap[newLabel].tokenIDs.push(tok.id);
            ship.hexLabel = newLabel;
        } 
        if (ship && tok.get("rotation") !== prev.rotation) {
            log(ship.name + " turning")
            let phi = Angle(tok.get("rotation"));
            phi = Math.round(phi/30) * 30;
            tok.set("rotation",phi);
        }
    }
    
    const destroyGraphic = (obj) => {
        let id = obj.get("id");
        if (id) {
            let ship = ShipArray[id];
            if (ship) {
                log(ship.name + " removed from Ship Array")
                let index = HexMap[ship.hexLabel].tokenIDs.indexOf(id);
                if (index > -1) {
                    HexMap[ship.hexLabel].tokenIDs.splice(index,1);
                }
                delete ShipArray[id];
            }
        }
    }






    const handleInput = (msg) => {
        if (msg.type !== "api") {
            return;
        }
        let args = msg.content.split(";");
        log(args);
        RemoveLines(["LOS"]);
        switch(args[0]) {
            case '!Dump':
                log(HexMap)
                log("State");
                log(state.FullThrust);
                log("Ship");
                log(ShipArray)
                break;
            case '!ClearState':
                ClearState(msg);
                break;
            case '!AddAbilities':
                AddAbilities(msg);
                break;
            case '!NextTurn':
                NextTurn();
                break;
            case '!SetFleets':
                SetFleets();
                break;
            case '!SetupGame':
                SetupGame(msg);
                break;

            case '!TokenInfo':
                TokenInfo(msg);
                break;
            case '!CheckLOS':
                CheckLOS(msg);
                break;
            case '!Roll':
                RollDice(msg);
                break;
            case '!Fire':
                Fire(msg);
                break;

        }
    };

   



    const registerEventHandlers = () => {
        on('chat:message', handleInput);
        //on("add:graphic", addGraphic);
        on('change:graphic',changeGraphic);
        on('destroy:graphic',destroyGraphic);
    };
    on('ready', () => {
        log("===>FullThrust<===");
        log("===> Software Version: " + version + " <===")
        LoadPage();
        DefineHexInfo();
        BuildMap();
        registerEventHandlers();
        sendChat("","API Ready at " + new Date().toLocaleTimeString("en-US", {timeZone: "America/Toronto"}) + " EST");
        log("On Ready Done")
    });
    return {
        // Public interface here
    };






})();


