const Main = (() => {
    const version = '2026.8.3';
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
    const Projectiles = ["Photon Torpedo", "Short Range Photon Torpedo", "Long Range Photon Torpedo"]
    const BeamWeapons = ["Phaser I","Phaser II","Phaser III","Phaser Bank","Disruptor","Heavy Disruptor"];

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

    function isEven(number) {
        return number % 2 === 0;
    }
    let flipFlop = true;


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
            this.mass = parseInt(aa.mass);
            this.maxThrust = parseInt(aa.thrusters_max);
            this.turn = (aa.advanceddrive === "1") ? 1:2;
            this.advShields = (aa.advancedscreens === "1") ? true:false;
            this.advHull = (aa.advancedhull === "1") ? true:false;
            this.advFC = (aa.advancedfirecontrol === "1") ? true:false;

            this.hullMax = parseInt(aa.hull_max) || 0;

            let weaponArray = [];
            let weaponList = [];
            for (let w=1;w<13;w++) {
                let weaponStatus = aa["weapon" + w + "status"];
                let weaponName = aa["weapon" + w + "name"] || " ";
                if (!weaponStatus || weaponStatus === "Off" || weaponStatus === "undefined") {continue};
                weaponName = weaponName.trim();
                let weaponType = aa["weapon" + w + "type"];
                let weaponFacing = aa["weapon" + w + 'facing'];
                if (!weaponFacing) {
                    log("W: " + w)
                    log(weaponName)
                    log(weaponType)
                    log(weaponStatus)
                } else {
                    weaponFacing = weaponFacing.toString().split("/").map((e) => parseInt(e));
                }

                let maxRange;
                if (weaponType === "Phaser I") {maxRange = 12};
                if (weaponType === "Phaser II") {maxRange = 24};
                if (weaponType === "Phaser III") {maxRange = 36};
                if (weaponType === "Disruptor") {maxRange = 12};
                if (weaponType === "Heavy Disruptor") {maxRange = 24};
                if (weaponType === "Phaser Bank") {maxRange = 24};
                if (weaponType === "Photon Torpedo") {maxRange = 30};
                if (weaponType === "Short Range Photon Torpedo") {maxRange = 20};
                if (weaponType === "Long Range Photon Torpedo") {maxRange = 45};

                let title = (weaponName + " " + weaponType).trim();
                let weapon = {
                    pos: w-1,
                    title: title,
                    status: weaponStatus,
                    name: weaponName,
                    type: weaponType,
                    facing: weaponFacing,
                    maxRange: maxRange,
                }
                weaponArray.push(weapon);
                weaponList.push(title);
            }
            this.weaponArray = weaponArray;
            this.weaponList = weaponList;
            this.hull = parseInt(token.get("bar1_value")) || 0;
            this.shields = parseInt(token.get("bar2_value")) || 0;
            this.shieldsMax = parseInt(token.get("bar2_max")) || 0;

            let damagedSystems = aa.damagedsystems || " ";
            damagedSystems = damagedSystems.split(",").filter((e) => e !== " ");

log(name)
            this.damagedSystems = damagedSystems;
log(this.damagedSystems)

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

        Damage(info) {
            //info => {normal: X, sap: Y, ap: Z, pen: P};
            //do normal first until shields exhausted then apply to armour and then hull
            //SAP is similar, 1/2 rnd to shields etc
            //AP is 1 to shields, then 1 to armour, then hull
            //pen is straight to hull
            let shields = parseInt(this.token.get("bar2_value"));
            let shieldsMax = parseInt(this.token.get("bar2_max"));
            if (shields/shieldsMax < 0.5) {
                //if shields buckling then becomes SAP
                info.sap += info.normal;
                info.normal = 0;
            }
            let hullDamage = 0;
            let armourDamage = 0;
            let armour = parseInt(Attribute(this.charID,"armour")) || 0;
            let shieldDamage = 0;

            if (info.normal > 0) {
                shieldDamage = Math.min(info.normal,shields);
                info.normal -= shieldDamage;
                shields -= shieldDamage;
                armourDamage = Math.min(info.normal,armour);
                armour -= armourDamage;
                info.normal -= armourDamage;
                hullDamage += info.normal;
            }
            if (info.sap > 0) {
                shieldDamage = Math.min(Math.round(info.sap/2),shields);
                info.sap -= shieldDamage;
                shields -= shieldDamage;
                armourDamage = Math.min(info.sap,armour);
                armour -= armourDamage;
                info.sap -= armourDamage;
                hullDamage += info.sap;
            }
            if (info.ap > 0) {
                shieldDamage = Math.min(1,shields);
                info.ap -= shieldDamage;
                shields -= shieldDamage;
                armourDamage = Math.min(1,armour);
                armour -= armourDamage;
                info.ap -= armourDamage;
                hullDamage += info.ap;
            }
            if (info.pen > 0) {
                armourDamage = Math.min(info.pen,armour);
                armour -= armourDamage;
                info.pen -= armourDamage;
                hullDamage += info.pen;
            }

            if (shieldDamage > 0) {
                let n = shieldDamage;
                if (armourDamage === 0 && hullDamage === 0) {
                    n = " All the "
                }
                outputCard.body.push("Shields took " + n + " Damage");
                this.SetShields(-shieldDamage);
                if (shields === 0) {
                    outputCard.body.push("[#ff0000]Shields are Down![/#]");
                }
            }
            if (armourDamage > 0) {
                outputCard.body.push("Armour took " + armourDamage + " Damage");
                AttributeSet(this.charID,"armour",armour);
                if (armour === 0) {
                    outputCard.body.push("[#ff0000]Armour is Gone![/#]");
                }
            }
            if (hullDamage > 0) {
                outputCard.body.push(hullDamage + " went through to the Hull");
                this.HullDamage(hullDamage);
            }



            
        }

        SetShields(change) {
            let shields = parseInt(this.token.get("bar2_value"));
            shields += change;
            this.token.set("bar2_value",shields);
            this.shields = shields;
            let shieldstatus = "#00ff00";
            let shieldPercent = Math.round(shields/this.shieldsMax * 100);
            if (shieldPercent <= 75) {shieldstatus = "#ffff00"};
            if (shieldPercent <= 50) {shieldstatus = "#FFA500"};
            if (shieldPercent <= 25) {shieldstatus = "#ff0000"};
            if (shieldPercent === 0) {shieldstatus = "transparent"};
            this.token.set("aura1_color",shieldstatus);
        }

 
        HullDamage(damage) {
            let startingHull = parseInt(this.token.get("bar1_value"));
            let hullMax = parseInt(this.token.get("bar1_max"));
            let hull = Math.max(0,(startingHull - damage)); // if 0 is destroyed
            this.hull = hull;
            if (hull > 0) {
                let levels = 4;
                if (this.advHull === 1) {
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
                    outputCard.body.push("[#ff0000]There were "+ noun[Math.min((casualties - 1),2)] + " casualties[/#]");
                    AttributeSet(this.charID,"crew",newCrew);
                }
                if (delta > 0) {
                    this.ThresholdDamage(startingLevel,finishLevel);
                }





            } else {
                this.Destroyed("Offline");
            }
        }

        ThresholdDamage(startingLevel,finishLevel) {
            let damagedSystems = this.damagedSystems;
            let needed = finishLevel + (finishLevel - 1 - startingLevel);
            let damaged = false;

            let roll, roll2;
            //command
            roll = randomInteger(6);
            roll2 = randomInteger(6);
            let command = Attribute(this.charID,"command");
            if (roll < needed && command === "Nominal") {
                outputCard.body.push("[hr]");
                damaged = true;
                if (roll2 === 6) {
                    outputCard.body.push("[#ff0000]The Command Bridge was Destroyed![/#]");
                    outputCard.body.push("[#ff0000]The Ship is Out of Control until this is Repaired[/#]");
                    this.token.set(SM.ooc,true);
                    AttributeSet(this.charID,"command","Destroyed");
                } else {
                    outputCard.body.push("[#ff0000]The Command Bridge was Damaged![/#]");
                    outputCard.body.push("[#ff0000]The Ship is Out of Control for " + roll2 + " turns or until Repaired[/#]");
                    this.token.set(SM.ooc,roll2);
                    AttributeSet(this.charID,"command","Offline");
                }
                damagedSystems.push("Command");
                outputCard.body.push("[hr]");
            }
            //lifesupport
            let lifesupport = Attribute(this.charID,"lifesupport");
            roll = randomInteger(6);
            roll2 = randomInteger(6);
            if (roll < needed && lifesupport === "Nominal") {
                outputCard.body.push("[hr]");
                damaged = true;
                outputCard.body.push("[#ff0000]Life Support was hit, and will fail in " + roll2 + " turns[/#]")
                outputCard.body.push("[#ff0000]If not repaired before then, the crew will abandon ship[/#]");    
                AttributeSet(this.charID,"lifesupport","Failing");
                this.token.set(SM.nolife,roll2);
                damagedSystems.push("Life Support");
                outputCard.body.push("[hr]");
            }
            //warpcore
            roll = randomInteger(6);
            roll2 = randomInteger(6);        
            let warpcore = Attribute(this.charID,"warpcore");
            if (roll < needed && warpcore === "Nominal") {
                outputCard.body.push("[hr]");
                damaged = true;
                if (roll2 === 6) {
                    outputCard.body.push("[#ff0000]Warp Core Breach! The Ship is Destroyed![/#]");
                    this.Destroyed("WarpCore");
                    return;
                } else if (roll2 === 5) {
                    outputCard.body.push("[#ff0000]The Warp Core was damaged but the Chief Engineer was able to Jettison it before it went Critical[/#]");
                    outputCard.body.push("[#ff0000]The Ship will drift, unable to take part in the rest of the battle[/#]");
                    AttributeSet(this.charID,"warpcore","Gone");
                    //not added to damaged systems, so cant be repaired
    //maybe make it so is essentially system unit, uncontrollable

                } else {
                    outputCard.body.push("[#ff0000]The Warp Core was damaged[/#]");
                    outputCard.body.push("[#ff0000]If not repaired, there is an increasing chance each turn it will go critical and explode[/#]");
                    AttributeSet(this.charID,"warpcore","Offline");
                    this.token.set(SM.warp,1);
                    damagedSystems.push("Warp Core");
                }
                outputCard.body.push("[hr]");
            }

            //impulse
            let impulse1 = Attribute(this.charID,"impulse1");
            let impulse2 = Attribute(this.charID,"impulse2");
            if (impulse1 !== "Offline" ||  impulse2 !== "Offline") {
                let roll = randomInteger(6);
                if (roll <= needed) {
                    outputCard.body.push("[hr]");
                    damaged = true;
                    let which = this.ImpulseDamage();
                    damagedSystems.push("Impulse Engines " + which);
                }
            }

            //systems with #s
            let systems = {
                "Shield Generator": "screens",
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
                        outputCard.body.push("[hr]");
                        damaged = true;
                        AttributeSet(this.charID,attribute,current);
                        outputCard.body.push("[#ff0000]A " + system + " has been Damaged[/#]");
                        if (current === 0) {
                            if (system === "Shield Generator") {
                                outputCard.body.push("[#ff0000]Shields are now Offline[/#]");
                                let cs = parseInt(this.token.get("bar2_value"));
                                state.FullThrust.shipState[this.id].shields = cs;
                                this.SetShields(-cs);
                            }
                            if (system === "Fire Control") {
                                outputCard.body.push("[#ff0000]Weapons cannot fire[/#]");
                            }
                        }
                        damagedSystems.push(system);
                    }
                }
            }
            
            //systems with Nominal vs Offline
            systems = {
                "Warp Drive": "warpdrive",
                "Cloaking Device": "cloak",
            }
            keys = Object.keys(systems);
            for (let i=0;i<keys.length;i++) {
                let system = keys[i];
                let attribute = systems[system];
                let current = parseInt(Attribute(this.charID,attribute));
                if (current === "Nominal") {
                    roll = randomInteger(6);
                    if (roll <= needed) {
                        outputCard.body.push("[hr]");
                        damaged = true;
                        AttributeSet(this.charID,attribute,"Offline");
                        outputCard.body.push("[#ff0000]" + system + " have been Damaged and knocked Offline[/#]");
                    }
                    damagedSystems.push(system);
                }
            }


            //Weapons
            for (let i=0;i<this.weaponArray.length;i++) {
                let weapon = this.weaponArray[i];
                let status = Attribute(this.charID,"weapon" + (weapon.pos + 1) + "status");
                let roll = randomInteger(6);

log(weapon.title + ": " + roll + " vs. " + needed)
log(status)
                if (roll <= needed && status !== "Offline") {
                    outputCard.body.push("[hr]");
                    damaged = true;
                    let title = (weapon.name + " " + weapon.type).trim();
                    outputCard.body.push("[#ff0000]" + title + " is Offline[/#]");
                    weapon.status = "Offline";
                    AttributeSet(this.charID,"weapon" + (weapon.pos + 1) + "status","Offline");
                    damagedSystems.push(title);
                }
            }


            AttributeSet(this.charID,"damagedsystems",damagedSystems.toString());
            this.damagedSystems = damagedSystems;
            if (damaged === true) {
                outputCard.body.push("[hr]");
            }



        }

        ImpulseDamage() {
            let impulse1 = Attribute(this.charID,"impulse1");
            let impulse2 = Attribute(this.charID,"impulse2");
            let oneEngine = false;
            if (impulse1 === "Offline" || impulse2 === "Offline") {
                oneEngine = true;
            }
            let which = randomInteger(2);
            if (which === 1 && impulse1 === "Offline") {
                which = 2;
            }
            if (which === 2 && impulse2 === "Offline") {
                if (impulse1 === "Offline") {
                    which = 3;
                } else {
                    which = 1;
                }
            }
            let speed = parseInt(this.token.get("bar3_value"));

            if (which !== 3) { //ie. both not offline
                AttributeSet(this.charID,"impulse" + which,"Offline");
                outputCard.body.push("[#ff0000]Impulse Engines are Damaged[/#]");
                if (oneEngine === true) {
                    outputCard.body.push("[#ff0000]They are now Offline and the Ship will Drift until repaired[/#]");
                    this.token.set(SM.nopower,true);
                    this.token.set("bar3_value",0);
                } else {
                    outputCard.body.push("[#ff0000]Thrusters and Turn are Halved[/#]");
                    let newSpeed = Math.round(speed/2);
                    this.token.set("bar3_value",newSpeed);  
                }
                outputCard.body.push("[hr]");
                return which;
            }
        }




        Destroyed(method) {
            //place the images on foreground area
            if (method === "WarpCore") {
                //warp explosion, check for damage in area, 200x200
                //remove at start of next turn using name 
                summonToken("-Oz3qbaCI9NYUvt2iNwB",this.token.get("left"),this.token.get("top"),200,0,"map");
                let dice = Math.round(this.mass/25);
                _.each(ShipArray,ship => {
                    if (ship.id !== this.id) {
                        let d = this.Distance(ship);
                        if (d <= 1) {
                            let blastDamage = 0;
                            for (let i=0;i<dice;i++) {
                                blastDamage += randomInteger(6);
                            }
                            let info = {
                                normal: 0,
                                sap: blastDamage,
                                ap: 0,
                                pen: 0,
                            }
                            outputCard.body.push("[hr]");
                            outputCard.body.push(ship.name + " is caught by the Explosion of the Warp Core, taking " + damage + " Damage");
                            ship.Damage(damage);
                        }
                    }
                })
            } else {
                //small explosion, place wreckage, 70x70
                outputCard.body.push(this.name + " breaks up, all remaining hands lost");
                //debris - place on map
                summonToken("-Oz3qelr57I7hwLrS5rR",this.token.get("left"),this.token.get("top"),70,0,"map");
                //explosion - remove at start of next turn using name, 100x100
                summonToken("-Oz3qYxcnBprYN7f61Yb",this.token.get("left"),this.token.get("top"),100,0,"map");
            }
            spawnFx(this.token.get("left"), this.token.get("top"), "burst-magic");
            this.token.remove();
            delete ShipArray[this.id];
        }




        Distance(b) {
            return HexMap[this.hexLabel].distance(HexMap[b.hexLabel]);
        }

        Move(newLabel) {
            let index = HexMap[this.hexLabel].tokenIDs.indexOf(this.id);
            if (index > -1) {
                HexMap[this.hexLabel].tokenIDs.splice(index,1);
            }
            HexMap[newLabel].tokenIDs.push(newLabel);
            this.token.set({
                left: HexMap[newLabel].centre.x,
                top: HexMap[newLabel].centre.y,
            })
            this.hexLabel = newLabel;
        }

        StartTurn() {
            //things to do at start of turn
            _.each(this.weaponArray,weapon => {
                if (weapon.status === "Fired") {
                    weapon.status = "Normal";
                    AttributeSet(this.charID,"weapon" + (weapon.pos + 1) + "status","Normal");
                }
            })
            state.FullThrust.shipState[this.id].targets = [];
            let result = this.Repairs();
            if (result === true) {
                PrintCard();
            } 
            if (result !== "New") {
                SetupCard(this.name,"Helm",this.faction);
                this.Helm();
                PrintCard();
            }
        }

        Helm() {
            let currentSpeed = parseInt(this.token.get("bar3_value"));
            let thrust = parseInt(this.maxThrust);
            let turn = parseInt(this.turn);
            let impulse1 = Attribute(this.charID,"impulse1") === "Offline" ? false:true;
            let impulse2 = Attribute(this.charID,"impulse2") === "Offline" ? false:true;
            if (impulse1 === false || impulse2 === false) {
                thrust = Math.round(thrust/2); //one engine down
            }
            if (impulse1 === false && impulse2 === false) {
                thrust = 0; //no engines
            }
            if (this.token.get("tint_color") === "#000000") {
                thrust = Math.round(thrust/2); //cloaked
            }
            let turnPts = Math.round(thrust/turn);
            outputCard.body.push("Current Speed: " + currentSpeed);
            outputCard.body.push("Thrust: " + thrust);
            outputCard.body.push("Turn Points: " + turn);
        }




        Repairs() {
            let dct = parseInt(Attribute(this.charID,"crew"));
            let damagedSystems = this.damagedSystems;
            let shields = parseInt(this.token.get("bar2_value"));
            let shieldsMax = parseInt(this.token.get("bar2_max"));
            let difference = shieldsMax - shields;
            let shieldFix = (shields < shieldsMax/2) ? 3:1;
            if (damagedSystems.length === 0 && shields === shieldsMax) {
                return false;
            }
            SetupCard(this.name,"Repairs",this.faction);

            if (damagedSystems.length === 0) {
                this.ShieldRepair(dct,difference,shieldFix);
            } else {
                //if more than one system damaged, put up options to prioritize one
                if (damagedSystems.length > 1) {
                    outputCard.body.push("Multiple Systems are damaged");
                    outputCard.body.push("Choose one to Prioritize");
                    _.each(damagedSystems,system => {
                        let rep = state.FullThrust.shipState[this.id].systemRepairs[system] || 0;
                        let button = "Priority: " + system;
                        if (rep > 0) {
                            button += "[Repair in Progress]";
                        }
                        let action = "!RepBack;" + this.id + ";" + system;
                        ButtonInfo(button,action);
                    })
                    PrintCard();
                    return "New";
                } else {
                    let dctAssigned = Math.min(dct,3);
                    this.RepairSystem(damagedSystems[0],dctAssigned);
                    dct -= dctAssigned
                    //if any dct remain, assign them to shield repair
                    if (dct > 0) {
                        this.ShieldRepair(dct,difference,shieldFix);
                    }
                }
            }
            return true;
        }

        Repairs2(chosen) {
            SetupCard(this.name,"Repairs",this.faction);
            //more than one system was damaged, feeds back from priority
            let damagedSystems = this.damagedSystems;
            damagedSystems.splice(damagedSystems.indexOf(chosen),1);
            damagedSystems.unshift(chosen);
            let dct = parseInt(Attribute(this.charID,"crew"));
            let num = 0;
            do {
                let system = damagedSystems[num];
                let dctAssigned = Math.min(dct,3);
                this.RepairSystem(system,dctAssigned);
                dct -= dctAssigned;
                num++;
            } while (dct > 0);
            //if any dct remain, assign them to shield repair
            if (dct > 0) {
                this.ShieldRepair(dct,difference,shieldFix);
            }
            PrintCard();
            SetupCard(this.name,"Helm",this.faction);
            this.Helm();
            PrintCard();
        }


        RepairSystem(system,assignedDCT) {
            let s = (assignedDCT === 1) ? " Team is":" Teams are";
            let s2 = (assignedDCT === 1) ? " Team was ": " Teams were ";
            let repairRoll = randomInteger(6);  
            let bonus = 0;
            if (state.FullThrust.shipState[this.id].systemRepairs[system]) {
                bonus = state.FullThrust.shipState[this.id].systemRepairs[system];
            }
            let needed = assignedDCT + bonus;
            if (repairRoll > needed) {
                let tip = "Roll: " + repairRoll + " > " + needed;
                tip = '['+ assignedDCT + '](#" class="showtip" title="' + tip + ')';   
                outputCard.body.push(tip + s + " still trying to fix " + system);
                state.FullThrust.shipState[this.id].systemRepairs[system] = (bonus + 1);
            } else {
                let tip = "Roll: " + repairRoll + " <= " + needed;
                let add = "";
                if (system === "Fire Control" || system === "Shield Generator") {
                    add = " a ";
                }
                tip = '['+ assignedDCT + '](#" class="showtip" title="' + tip + ')';   
                outputCard.body.push(tip + s2 + " able to repair " + add + system);
                let translateList = [
                    {name: "Command", att: "command"},
                    {name: "Life Support", att: "lifesupport"},
                    {name: "Warp Core", att: "warpcore"},
                    {name: "Impulse Engines 1", att: "impulse1"},
                    {name: "Impulse Engines 2", att: "impulse2"},
                    {name: "Shield Generator", att: "screens"},
                    {name: "Fire Control", att: "firecontrol"},
                    {name: "Cloaking Device", att: "cloak"},
                    {name: "Warp Drive", att: "warpdrive"},
                ]
                let sys = translateList.find((e) => e.name === system);
log("Sys: " + sys)
                if (sys) {  
                    if (system === "Fire Control" || system === "Shield Generator") {
                        let current = parseInt(Attribute(this.charID,sys.att));
                        if (current === 0 && system === "Fire Control") {
                            outputCard.body.push("The Ship can target its weapons now");
                        }
                        if (current === 0 && system === "Shield Generator") {
                            let shields = state.FullThrust.shipState[this.id].shields;
                            this.SetShields(shields);
                            if (shields > 0) {
                                outputCard.body.push("Shields have been restored");
                            } else {
                                outputCard.body.push("Shields can be repaired now");
                            }                       
                        }
                        current++;
                        AttributeSet(this.charID,sys.att,current);
                    } else {
                        AttributeSet(this.charID,sys.att,"Nominal");
                        if (system === "Command") {this.token.set(SM.ooc,false)};
                        if (system === "Life Support") {this.token.set(SM.nolife,false)};
                        if (system === "Warp Core") {this.token.set(SM.warp,false)};
                    }
                } else {
                    //is a weapon
log("Is a Weapon")
                    for (let i=0;i<this.weaponArray.length;i++) {
                        let weapon = this.weaponArray[i];
log("I:  " + i)
log(weapon)
log(system)
                        if (weapon.title === system) {
                            AttributeSet(this.charID,"weapon" + (i+1) + "status","Fired");
                            break;
                        }
                    }
                }

                let damagedSystems = this.damagedSystems;
                let index = damagedSystems.indexOf(system);
                if (index > -1) {
                    damagedSystems.splice(damagedSystems.indexOf(system),1);
                }
                this.damagedSystems = damagedSystems;
                AttributeSet(this.charID,"damagedsystems",damagedSystems.toString());
                state.FullThrust.shipState[this.id].systemRepairs[system] = 0;




            }



        }






        ShieldRepair(dct,max,num) {
            let rep = 0;
            for (let i=0;i<dct;i++) {
                rep += randomInteger(num);
            }
            rep = Math.min(rep,max);
            this.SetShields(rep);
            outputCard.body.push("Crews Restored " + rep + " Shield Pts");
            if (rep === max) {
                outputCard.body.push("Shields are now at Full");
            }
        }



    }


    const Heading = (heading) => {
        if (heading > 11) {heading = 12 - heading};
        if (heading < 0) {heading = 12 + heading};
        return heading;
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
        //Weapons
        let macros = {};
        for (let w=0;w<ship.weaponArray.length;w++) {
            let weapon = ship.weaponArray[w];
            let type;
            if (Projectiles.includes(weapon.type)) {
                type = weapon.name + " " + weapon.type;
                type = type.trim();
            } else {
                type = "Avail. " + weapon.type + "s";
            }
            if (macros[type]) {
                macros[type].push(weapon.pos);
            } else {
                macros[type] = [weapon.pos];
            }
        }

        let keys = Object.keys(macros);
        for (let i=0;i<keys.length;i++) {
            action = "!Fire;@{selected|token_id};@{target|token_id};";
            action += macros[keys[i]].toString();
            abilityName = (i+1) + ": Fire " + keys[i];
            if (keys[i].includes("Photon")) {
                action += ";" + "?{Mode|Single|Spread [3]}";
            }
            AddAbility(abilityName,action,ship.charID);
        }


        if (Attribute(ship.charID,"cloak",true) === "1") {
            action += "!Orders;@{selected|token_id};Cloak/Decloak";
            AddAbility("Cloak/Decloak",action,ship.charID);
        }

        CreateHelmAbility(ship);







    }

    const CreateHelmAbility = (ship) => {
        let helmID = state.FullThrust.shipState[ship.id].helmID;
        if (helmID) {
            let helmObj = findObjs({_type: "ability", _characterid: ship.charID, _id: helmID});
            helmObj.remove();
        }
        let currentSpeed = parseInt(ship.token.get("bar3_value"));
        let thrust = parseInt(ship.maxThrust);
        let turn = parseInt(ship.turn);
        let impulse1 = Attribute(ship.charID,"impulse1") === "Offline" ? false:true;
        let impulse2 = Attribute(ship.charID,"impulse2") === "Offline" ? false:true;
        if (impulse1 === false || impulse2 === false) {
            thrust = Math.round(thrust/2); //one engine down
        }
        if (impulse1 === false && impulse2 === false) {
            thrust = 0; //no engines
        }
        if (ship.token.get("tint_color") === "#000000") {
            thrust = Math.round(thrust/2); //cloaked
        }


        let turnPts = Math.round(thrust/turn);

        let part = thrust + ";?{Thrust - Current Speed: " + currentSpeed;
        part += "|Maintain Speed,0|Increase Speed,?{Increase";
        for (let i=1;i<=thrust;i++) {
            part += "&#124;Increase Speed by " + i;
        }
        part += "&#125;|Decrease Speed,?{Decrease";
        for (let i=1;i<=thrust;i++) {
            part += "&#124;Decrease Speed by " + i;
        }
        part += "&#125;";
        part += "};?{Course|Ahead,Ahead|Port,?{Points";
        for (let i=1;i<=turnPts;i++) {
            let s = (i===1) ? "":"s"
            part += "&#124;Port " + i + " Point" + s;
        }
        part += "&#125;|Starboard,?{Points";
        for (let i=1;i<=turnPts;i++) {
            let s = (i===1) ? "":"s"
            part += "&#124;Stbd " + i + " Point" + s;
        }
        part += "&#125;}";
        action = "!Helm;@{selected|token_id};" + part;
        helmID = AddAbility("Helm",action,ship.charID);
        state.FullThrust.shipState[ship.id].helmID = helmID;
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




  




    const SetupGame = (msg) => {
        
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
        tokens = findObjs({
            _pageid: Campaign().get("playerpageid"),
            _type: "graphic",
            _subtype: "token",
            layer: "map",
        });
        _.each(tokens,token => {
            log(token.get("name"))
            let name = token.get("name");
            if (name && (name === "Ship Debris" || name.includes("Explosion"))) {
                token.remove();
            }
        })


        AddTokens();
        _.each(ShipArray,ship => {
            if (ship.type === "Asteroid") {
                //randomize direction


            } 
            if (ship.type === "Starship") {
log(ship.name)
                //bars on token
                let hullMax = parseInt(Attribute(ship.charID,"hull",true)) || 1;
                ship.hull = ship.hullMax;
                AttributeSet(ship.charID,"hull",hullMax);

                let thrusters = Attribute(ship.charID,"thrusters");
log(thrusters)
                speed = parseInt(thrusters) || 0;
                AttributeSet(ship.charID,"speed",speed);


                let shieldsMax = parseInt(Attribute(ship.charID,"shields",true)) || 0;
                ship.shields = shieldsMax;
                ship.shieldsMax = shieldsMax;
                AttributeSet(ship.charID,"shields",shieldsMax);
                let shieldColour = "#00ff00";
                if (shieldsMax === 0) {
                    shieldColour = "transparent";
                }

                let screens = parseInt(Attribute(ship.charID,"screens",true)) || 0;
                AttributeSet(ship.charID,"screens",screens);

                let armour = parseInt(Attribute(ship.charID,"armour",true)) || 0;
                AttributeSet(ship.charID,"armour",armour);

                //uses Attributes only
                let nominalAttributes = ["command","lifesupport","warpcore","sensors","impulse1","impulse2","warpdrive"]
                for (let i=0;i<nominalAttributes.length;i++) {
                    AttributeSet(ship.charID,nominalAttributes[i],"Nominal");
                }

                let cloak = Attribute(ship.charID,"cloak",true);
                if (cloak === "1") {
                    AttributeSet(ship.charID,"cloak","Nominal");
                }

                let fc = parseInt(Attribute(ship.charID,"firecontrol",true)) || 1;
                AttributeSet(ship.charID,"firecontrol",fc);
log(fc)
                let crew = Math.ceil(ship.mass/20);
                AttributeSet(ship.charID,"crew",crew);
                AttributeSet(ship.charID,"crew",crew,true);

                AttributeSet(ship.charID,"damagedsystems","");

                let torps = parseInt(Attribute(ship.charID,"torpedo",true)) || 0;
                AttributeSet(ship.charID,"torpedo",torps);


                let hullID = AttributeID(ship.charID,"hull");
                let shieldID = AttributeID(ship.charID,"shields");
                let speedID = AttributeID(ship.charID,"speed");

                ship.token.set({
                    bar1_value: hullMax,
                    bar1_max: hullMax,
                    bar1_link: hullID,

                    bar2_value: shieldsMax,
                    bar2_max: shieldsMax,
                    bar2_link: shieldID,

                    bar3_value: speed,
                    bar3_max: "",
                    bar3_link: speedID,

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

                state.FullThrust.shipState[ship.id] = {
                    damageControl: "Vital", //which system is currently prioritized
                    shields: shieldsMax, //mainly used by cloaking ships
                    emergencyThrusts: 0, //how many it has done this game
                    repairs: false, //flag for ship having done repairs this turn
                    systemRepairs: {}, //systems being repaired
                    targets: [], //tracks targets fired on this turn
                    helmID: "",
                }

                AddAbilities2(ship);


            }

        });




        sendChat("","Fleets Added")


    }

    const TestPics = () => {
        _.each(ShipArray,ship => {
            if (ship.type === "Starship") {
                //bars on token
                ship.hull = ship.hullMax;
                AttributeSet(ship.charID,"hull",ship.hull);





                let shieldsMax = parseInt(Attribute(ship.charID,"shields",true));
                ship.shields = 0;
                ship.shieldsMax = shieldsMax;
                AttributeSet(ship.charID,"shields",0);
            
                //uses Attributes only
                AttributeSet(ship.charID,"command","Destroyed");
                AttributeSet(ship.charID,"lifesupport","Failing");
                AttributeSet(ship.charID,"warpcore","Critical");

                AttributeSet(ship.charID,"firecontrol",0);

                AttributeSet(ship.charID,"impulse1","Offline");
                AttributeSet(ship.charID,"impulse2","Offline");
                AttributeSet(ship.charID,"warpdrive","Offline");


                let cloak = Attribute(ship.charID,"cloak",true);
                if (cloak === "1") {
                    AttributeSet(ship.charID,"cloak","Offline");
                }

                AttributeSet(ship.charID,"screens",0);

                AttributeSet(ship.charID,"damagedsystems","");

                for (let i=0;i<ship.weaponArray.length;i++) {
                    ship.weaponArray[i].status = "Normal";
                    AttributeSet(ship.charID,"weapon" + (i+1) + "status","Offline");
                }


            }

        });



    }


    const Orders = (msg) => {
        let Tag = msg.content.split(";");
        let id = Tag[1];
        let order = Tag[2];
        let ship = ShipArray[id];
        if (!ship) {
            sendChat("","Error");
            return;
        }

        let speed = parseInt(ship.token.get("bar3_value"));
        let driveType = (Attribute(ship.charID,"advanceddrive") === "1") ? "Advanced":"Normal"; 
        let turn = (driveType === "Normal") ? 2:1;
        let turnPts = Math.round(speed/turn);




        SetupCard(ship.name,order,ship.faction);
        if (speed === 0 && (order === "Dead Stop" || order === "Emergency Thrust")) {
            outputCard.body.push("The Ship is Dead in the Water and cannot do this");
            order = "None";
        }
        if (order === "Emergency Thrust" && ship.token.get("tint_color") === "#000000") {
            outputCard.body.push("Pushing the Engines this way will remove our Cloak!");
            order = "None";
        }
        if (order === "Cloak/Decloak" && Attribute(ship.charID,"cloak") === "Offline") {
            outputCard.body.push("Cloaking Device is Offline!");
            order = "None";
        }


        if (order === 'Dead Stop') {
            outputCard.body.push("The Ship comes to a Dead Stop");
            outputCard.body.push("Max turn " + (turnPts + 1) + " Points");
        } 

        if (order === "Emergency Thrust") {
log("Here")
            let newSpeed, newTurnPts;
            let roll = randomInteger(6);
            let mod = state.FullThrust.shipState[ship.id].emergencyThrusts;
log(mod)
            roll += mod;
            let which = "";
            if (roll < 6) {
                newSpeed = Math.round(speed * 1.5);
                newTurnPts = Math.round(newSpeed/turn);
                outputCard.body.push("The Impulse Engines are pushed to 150%");
                outputCard.body.push("Speed this turn is " + newSpeed);
                outputCard.body.push("Max turn is " + newTurnPts + " Points");
                if (roll > 3) {
                    outputCard.body.push("After the Maneuvre, the engines are Damaged");
                    which = ship.ImpulseDamage();
                }
            }
            if (roll >= 6) {
                newSpeed = Math.round(speed /2);
                newTurnPts = Math.round(newSpeed/turn);
                outputCard.body.push("The Impulse Engines are pushed, but immediately take damage");
                which = ship.ImpulseDamage();
            }
            if (which !== "") {
                let ds = Attribute(this.charID,"damagedsystems");
                ds += "," + "Impulse Engine " + which;
                AttributeSet(ship.charID,"damagedsystems",ds);
            }
            state.FullThrust.shipState[ship.id].emergencyThrusts++;
        }


        if (order === "Cloak/Decloak") {
            if (ship.token.get("tint_color") === "transparent") {
                ship.token.set("tint_color","#000000");
                outputCard.body.push("The Ship is now Cloaked");
                outputCard.body.push("Shields and Weapons do not function while cloaked");
                let cs = parseInt(ship.token.get("bar2_value"));
                state.FullThrust.shipState[id].shields = cs
                ship.SetShields(-cs);
            } else {
                ship.token.set("tint_color","transparent");
                outputCard.body.push("Shields and Weapons are back Online");
                let shields = state.FullThrust.shipState[id].shields;
                ship.SetShields(shields);
            }
            PlaySound("Cloak");
        }


        if (order === "Engineering") {
            let suborder = Tag[3]; //Repairs or a System
            if (suborder === "Repairs") {
                Repairs(ship);
            } else {
                state.FullThrust.shipState[id].damageControl = suborder;
                outputCard.body.push(suborder + " Systems will be given priority for Damage Control Teams");
            }
        }

        
        PrintCard();



    }

    const Repairs = (ship) => {
        let repaired = state.FullThrust.shipState[ship.id].repairs;
        if (repaired === true) {
            outputCard.body.push("Ship has already conducted Repairs this Turn");
            return;
        }
        let dct = parseInt(Attribute(ship.charID,"crew"));
        let ds = Attribute(ship.charID,"damagedsystems").split(",");
        let damagedSystems = [];
        _.each(ds,d => {
            if (d && d !== "None" && d !== "") {
                damagedSystems.push(d);
            }
        })

        let shields = parseInt(ship.token.get("bar2_value"));
        let shieldsMax = parseInt(ship.token.get("bar2_max"));

        if (damagedSystems.length === 0) {
            if (shields === shieldsMax) {
                outputCard.body.push("There is nothing to repair, Captain!");
            } else {
                ShieldRepair(ship,dct);
                state.FullThrust.shipState[ship.id].repairs = true;
            }
        } else {
            //create a list of systems with priorities attached
            //at end if remaining damage teams, will assign to shield repair
            if (shields < shieldsMax) {
                damagedSystems.push("Shields");
            }
            let priority = state.FullThrust.shipState[ship.id].damageControl;
            let shGenPriority = (priority === "Shields") ? 5:2;
            let shieldPriority = (priority === "Shields") ? 5:1;
            let impPriority = (priority === "Impulse Engines") ? 5:2;
            let fcPriority = (priority === "Fire Control") ? 5:(ship.faction === "Klingon") ? 3:2;
            let systemList = [
                {name: "Warp Core", priority: 4},
                {name: "Life Support", priority: 4},
                {name: "Command", priority: 4},
                {name: "Shield Generator", priority: shGenPriority},
                {name: "Fire Control", priority: fcPriority},
                {name: "Impulse Engines 1", priority: impPriority},
                {name: "Impulse Engines 2", priority: impPriority},
                {name: "Cloaking Device", priority: 3},
                {name: "Warp Drive", priority: 1},
                {name: "Shields", priority: shieldPriority},
            ]
            let weapons = ship.weaponList;
            let weaponPriority = (ship.faction === "Klingon") ? 3:2;
            if (priority === "Weapons") {
                weaponPriority = 5;
            }
            for (let i=0;i<weapons.length;i++) {
                let item = {name: weapons[i],priority: weaponPriority};
                systemList.push(item);
            }

            systemList = systemList.sort((a,b) => b.priority - a.priority);
            log(systemList)
            //pare list to damaged systems
            let repairList = [];
            for (let i=0;i<systemList.length;i++) {
                let system = systemList[i];
                if (damagedSystems.includes(system.name)) {
                    repairList.push(system.name);
                }
            }
            log(repairList);
            //assign dct to each system until used, 1st item gets up to 3 teams
            for (let i=0;i<repairList.length;i++) {
                let system = repairList[i];
                let assignedDCT = (i===0) ? Math.min(dct,3):1;
                let s = (assignedDCT === 1) ? " Team is":" Teams are";
                let s2 = (assignedDCT === 1) ? " Team was ": " Teams were ";
                let repairRoll = randomInteger(6);  
                if (state.FullThrust.shipState[ship.id].systemRepairs[system]) {
                    bonus = state.FullThrust.shipState[ship.id].systemRepairs[system];
                } else {
                    state.FullThrust.shipState[ship.id].systemRepairs[system] = 0;
                    bonus = 0;
                }
                let needed = assignedDCT + bonus;
                if (system === "Shields") {
                    ShieldRepair(ship,assignedDCT);
                } else {
                    if (repairRoll > needed) {
                        let tip = "Roll: " + repairRoll + " > " + needed;
                        tip = '['+ assignedDCT + '](#" class="showtip" title="' + tip + ')';   
                        outputCard.body.push(tip + s + " still trying to fix " + system);
                        state.FullThrust.shipState[ship.id].systemRepairs[system] = (bonus + 1);
                    } else {
                        let tip = "Roll: " + repairRoll + " <= " + needed;
                        let add = "";
                        if (system === "Fire Control" || system === "Shield Generator") {
                            add = " a ";
                        }
                        tip = '['+ assignedDCT + '](#" class="showtip" title="' + tip + ')';   
                        outputCard.body.push(tip + s2 + " able to repair " + add + system);
                        let translateList = [
                            {name: "Command", att: "command"},
                            {name: "Life Support", att: "lifesupport"},
                            {name: "Warp Core", att: "warpcore"},
                            {name: "Impulse Engines 1", att: "impulse1"},
                            {name: "Impulse Engines 2", att: "impulse2"},
                            {name: "Shield Generator", att: "screens"},
                            {name: "Fire Control", att: "firecontrol"},
                            {name: "Cloaking Device", att: "cloak"},
                            {name: "Warp Drive", att: "warpdrive"},
                        ]
                        let sys = translateList.find((e) => e.name === system);
                        if (sys) {  
                            if (system === "Fire Control" || system === "Shield Generator") {
                                let current = parseInt(Attribute(ship.charID,sys.att));
                                if (current === 0 && system === "Fire Control") {
                                    outputCard.body.push("The Ship can target its weapons now");
                                }
                                if (current === 0 && system === "Shield Generator") {
                                    let shields = state.FullThrust.shipState[ship.id].shields;
                                    ship.SetShields(shields);
                                    if (shields > 0) {
                                        outputCard.body.push("Shields have been restored");
                                    } else {
                                        outputCard.body.push("Shields can be repaired now");
                                    }                       
                                }
                                current++;
                                AttributeSet(ship.charID,sys.att,current);
                            } else {
                                AttributeSet(ship.charID,sys.att,"Nominal");
                                if (system === "Command") {ship.token.set(SM.ooc,false)};
                                if (system === "Life Support") {ship.token.set(SM.nolife,false)};
                                if (system === "Warp Core") {ship.token.set(SM.warp,false)};
                            }
                        } else {
                            //is a weapon
                            for (let i=0;i<ship.weaponArray;i++) {
                                let weapon = ship.weaponArray[i];
                                let num = weapon.pos + 1;
                                if (weapon.title === system) {
                                    AttributeSet(ship.charID,"weapon" + num + "status","Fired");
                                    break;
                                }
                            }
                        }


                        damagedSystems.splice(damagedSystems.indexOf(system),1);
                        let repaired = damagedSystems.toSpliced(damagedSystems.indexOf("Shields"),1).toString();
                        AttributeSet(ship.charID,"damagedsystems",repaired);
                        state.FullThrust.shipState[ship.id].systemRepairs[system] = 0;
                    }
                }
                dct -= assignedDCT;
                if (dct <= 0) {
                    break;
                }
            }

            state.FullThrust.shipState[ship.id].repairs = true;


        }
    }


    const Helm = (msg) => {
///needs work if keeping
//["!Helm","-OzcDRbtvA4HNItU93Vy","6","Increase Speed by 2","Ahead"]

        let Tag = msg.content.split(';');
        let ship = ShipArray[Tag[1]];
        if (!ship) {return};
        let maxThrust = parseInt(Tag[2]);
        let thrustChoice = Tag[3] || "0";
        let thrust = parseInt(thrustChoice.replace(/[^\d]/g,"")) || 0;
        let course = Tag[4];
        let coursePoints = 0;
        //course might be Ahead, or Port X Points or Stbd X Points
        if (course.includes("Port") || course.includes("Stbd")) {
            coursePoints = parseInt(course.replace(/[^\d]/g,""));
        } 
        let finalThrust = Math.max(Math.min(maxThrust - coursePoints, thrust),0);
        let newSpeed;
        let currentSpeed = parseInt(ship.token.get("bar3_value"));
        if (thrustChoice.includes("Decrease")) {
            newSpeed = currentSpeed - thrust;
        } else {
            newSpeed = currentSpeed + thrust;
        }
        SetupCard(ship.name,"Impulse",ship.faction);
        if (finalThrust !== thrust) {
            outputCard.body.push("Thrust was reduced to " + finalThrust + " due to Turning");
            outputCard.body.push("[hr]");
        }
        
        //1st half of movement - do 1/2 (rnd down) turn then move ahead
        //2nd half of movement - do 1/2 (rnd up) turn then move ahead

        let currentHeading =  Heading(Math.round(Angle(ship.token.get("rotation"))/30));
        let halves = [],turns = [];
        turns[0] = course.includes("Port") ? -Math.floor(coursePoints/2) : course === "Ahead" ? 0:Math.floor(coursePoints/2);
        turns[1] = course.includes("Port") ? -Math.ceil(coursePoints/2) : course === "Ahead" ? 0:Math.ceil(coursePoints/2);
        halves[0] = Math.floor(newSpeed/2);
        halves[1] = newSpeed - halves[0];
log(newSpeed)
log(halves)
log(turns)

let path = [];
path.push(ship.hexLabel);
        let currentCube = HexMap[ship.hexLabel].cube;

        for (let half=0;half<2;half++) {
            currentHeading = Heading(currentHeading + turns[half]);
            ship.token.set("rotation",(currentHeading * 30));

            for (let i=0;i<halves[half];i++) {
                let d;
                if (currentHeading % 2 === 0) {
                    d = currentHeading/2;
                } else {
                    if (flipFlop === true) {
                        d = Heading(currentHeading + 1) / 2;
                    } else {
                        d = Heading(currentHeading - 1) / 2;
                    }
                    flipFlop = (flipFlop === true) ? false:true;
                }
                let direction = DIRECTIONS[d];
                currentCube = currentCube.neighbour(direction);
                let newLabel = currentCube.label();
                ship.Move(newLabel);
path.push(newLabel)
            }
        }




        

        let adv = (thrustChoice.includes("Increase")) ? " increased to ": (thrustChoice.includes("Decrease")) ? " decreased to ":" maintained at ";
        outputCard.body.push("Speed " + adv + newSpeed);
        let verb = "maintained at"
        if (course !== "Ahead") {
            verb = "changed to"   
        }

        outputCard.body.push("Course " + verb + " a bearing of "+ ship.token.get("rotation"))
        ship.token.set("bar3_value",newSpeed);

outputCard.body.push("Path: " + path.toString());



        PrintCard()
    }




    const RepBack = (msg) => {
        //the repair choice if multiple systems damaged
        let Tag = msg.content.split(";");
        let ship = ShipArray[Tag[1]];
        let system = Tag[2];
        ship.Repairs2(system);
    }











    const Ping = (point) => {
        sendPing(point.x,point.y, Campaign().get('playerpageid'), null, true); 
    }





    const Fire = (msg) => {
        let Tag = msg.content.split(";");
        let shooter = ShipArray[Tag[1]];
        let target = ShipArray[Tag[2]];
        let weaponPos = Tag[3].split(",");
        let mode = Tag[4] || "None"; //Single, Spread  for Photons
        let errorMsg = [];

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

        SetupCard(shooter.name,"Tactical Station",shooter.faction);

        let availableFC = parseInt(Attribute(shooter.charID,"firecontrol")) || 0;

log("FC: " + availableFC)

        let advFC = (Attribute(shooter.charID,"advancedfirecontrol") === "1") ? true:false;
log("Adv?  " + advFC)
        if (advFC === true) {
            availableFC *= 2;
        }
        if (availableFC === 0) {
            errorMsg.push("Fire Control is offline, ship cannot fire");
        } else {
            let targetsFiredOn = state.FullThrust.shipState[shooter.id].targets;
log("Target #s: " + targetsFiredOn.length)
            availableFC -= targetsFiredOn.length;
            if (targetsFiredOn.includes(target.id) === false && availableFC === 0) {
                errorMsg.push("All Fire Controls have been used this turn");
            } 
        }


        if (SM.ooc === true) {
            errorMsg.push("Ship is Out of Control and Cannot Fire");
        }
        if (SM.nopower === true) {
            errorMsg.push("Ship has no Power and Cannot Fire");
        }
        if (shooter.token.get("tint_color") === "#000000") {
            errorMsg.push("Ship is Cloaked and cannot Fire");
        }

        let losResult = LOS(shooter,target);
        if (losResult.los === false) {
            errorMsg.push("No LOS - " + losResult.losReason);
        }
        let shooterArcs = losResult.shooterArcs;

        let weaponsFiring = [];
        let weaponType;
        let conditions = [];
        let magazine = parseInt(Attribute(shooter.charID,"torpedo")) || 0;



        for (let i=0;i<weaponPos.length;i++) {
            let pos = weaponPos[i];
            let weapon = shooter.weaponArray[pos];
log(weapon)
            weaponType = weapon.type;
            let facing = weapon.facing; //will be an array of facing #s
            let inArc = facing.some(item => shooterArcs.includes(item));
            let status = Attribute(shooter.charID,"weapon" + (weapon.pos + 1) + "status");
            if (Projectiles.includes(weaponType)) {
                if (magazine === 0) {
                    conditions.push("No Ammo");
                    continue;
                }
                if (magazine < 3 && mode.includes("Spread")) {
                    conditions.push("Low Ammo");
                    continue;
                }
            }

            if (inArc === false) {
                conditions.push("Arc");
                continue;
            }
            if (losResult.distance > weapon.maxRange) {
                conditions.push("Range");
                break; //as all same range for that type
            }
            if (weapon.status === "Fired") {
                conditions.push("Fired");
                continue;
            }
            if (weapon.status === "Offline") {
                conditions.push("Offline");
                continue;
            }
            weaponsFiring.push(pos);
        }

        let s = (weaponsFiring.length === 1) ? "":"s";
        let s2 = (weaponsFiring.length === 1) ? "s":"";

        if (weaponsFiring.length === 0) {
            if (conditions.includes("Range")) {
                errorMsg.push("Target is out of Range of this Weapon");
            }
            if (conditions.includes("Arc")) {
                errorMsg.push("One or More Weapons are Out of Arc");
            }
            if (conditions.includes("Fired")) {
                errorMsg.push("One or More Weapons have Already Fired");
            }
            if (conditions.includes("No Ammo")) {
                errorMsg.push("Out of Ammunition");
            }
            if (conditions.includes("Low Ammo")) {
                errorMsg.push("Low in Ammunition for a Spread");
            }
            if (conditions.includes("Offline")) {
                errorMsg.push("One or More Weapons are Offline");
            }
        }

        if (ErrorMsg(errorMsg)) {
            PrintCard();
            return;
        }

        let shieldGens = parseInt(Attribute(target.charID,"screens")) || 0;
        let totalDamage = 0;
        let hits = 0;

        let fxObj;
        let sound;

        if (Projectiles.includes(weaponType)) {
            //roll to hit, then damage
            let hitTip = "";
            let damageTip = "";
            let rangeCharts = {
                "Photon Torpedo": [6,12,18,24,30],
                "Short Range Photon Torpedo": [4,8,12,16,20],
                "Long Range Photon Torpedo": [9,18,27,36,45],
                //others
            }
            let index = rangeCharts[weaponType].findIndex(num => losResult.distance <= num); //finds first element <= distance to target
            let mod = 2;
            if (mode.includes("Spread")) {
                mod = 1
                hitTip = "<br>Spread = +1 to Hit";
            };
            let toHit = index + mod;
            let s = (mode === "Spread [3]") ? "s":"";
            let o = (s === "s") ? "spread of 3 ":"single ";
            let miss = (s === "s") ? " miss":" misses";
            let hit = (s === "s") ? " Hit!":" Hits!";
            let weaponName = weaponType;
            outputCard.body.push(shooter.name + " fires a " + o + weaponName + s + " at " + target.name);

            let hitRoll = randomInteger(6);
            hitTip = "Roll To Hit: " + hitRoll + " vs. " + toHit + "+" + hitTip;
            if (hitRoll >= toHit) {
                hitTip = '['+ hit + ' ](#" class="showtip" title="' + hitTip + ')';                
                outputCard.body.push("The " + weaponName + s + hitTip);
                let damageRoll1 = randomInteger(6);
                let damageRoll2 = randomInteger(6);
                let damage;
                let info = {
                    normal: 0,
                    sap: 0,
                    ap: 0,
                    pen: 0,
                }
                let damageType = "Normal";
                if (s === "s") {
                    damage = Math.max(damageRoll1,damageRoll2);
                    if (shieldGens === 2) {damage = Math.max(0,damage - 1)};
                    info.normal = damage;
                    damageTip = "Damage Rolls: " + damageRoll1 + "/" + damageRoll2;
                } else {
                    damage = damageRoll1;
                    damageTip += "<br>Damage Roll: " + damageRoll1;
                    if (shieldGens === 2) {damage = Math.max(0,damage - 1)};
                    info.sap = damage;
                }
                if (shieldGens === 2) {
                    damageTip += "<br>Reinforced Shields = -1 Damage";
                }
                damageTip = '[' + damage + '](#" class="showtip" title="' + damageTip + ')';
                outputCard.body.push(damageTip + " Damage is done");
                outputCard.body.push("[hr]");
                target.Damage(info);
            } else {
                hitTip = '['+ miss + ' ](#" class="showtip" title="' + hitTip + ')';                
                outputCard.body.push("The " + weaponName + s + hitTip);
            }

            let ammo = (mode.includes("Spread")) ? 3:1;
            magazine -= ammo;
            AttributeSet(shooter.charID,"torpedo",magazine);

            fxObj = findObjs({type: "custfx", name: "Photon"})[0];
            sound = (mode.includes("Spread")) ? "Spread": (weaponType.includes("Short")) ? "Short Range Photon":"Photon";

        } else if (BeamWeapons.includes(weaponType)) {
            //Beams etc 
            //to hit and damage are same roll
            //weaponsFiring length is # of weapons firing
            let diceChart = {
                "Phaser I": [1],
                "Phaser II": [2,1],
                "Phaser Bank": [2,1],
                "Phaser III": [3,2,1],
                "Disruptor": [1],
                "Heavy Disruptor": [2,1],
            }
            let rangeBand = Math.floor(losResult.distance/12);
            let dice = diceChart[weaponType][rangeBand] || 1;

            let info = {
                normal: 0,
                sap: 0,
                ap: 0,
                pen: 0,
            }            
            let damageChart = {
                Phaser: {
                    0: [0,0,0,0,1,1,2],
                    1: [0,0,0,0,0,1,2],
                    2: [0,0,0,0,0,1,1],
                },
                Disruptor: {
                    0: [0,0,0,1,2,3,4],
                    1: [0,0,0,0,1,2,3],
                    2: [0,0,0,0,0,1,2],
                }
            }
            let masterType;

            if (weaponType.includes("Phaser")) {
                masterType = "Phaser";
                fxObj =  findObjs({type: "custfx", name: "Phaser"})[0];
                sound = "Phasers";
                PlaySound("Phasers");
            }
            if (weaponType.includes("Disruptor")) {
                masterType = "Disruptor";
                sound = "Disruptor"
                fxObj =  findObjs({type: "custfx", name: "Disruptor"})[0];
            }

            let damageList = damageChart[masterType][shieldGens];
            let displayList = damageList.slice(1);
            let penList = damageChart[masterType][0].slice(1);

            for (let i=0;i<weaponsFiring.length;i++) {
                let weapon = shooter.weaponArray[weaponsFiring[i]];
                let rolls = [];
                let hit = false;
                let damage = 0;
                let penDamage = 0;
                for (let j=0;j<dice;j++) {
                    let roll = randomInteger(6);
                    let d = damageList[roll];
                    if (d > 0) {
                        hit = true;
                    }
                    damage += d;
                    //penetrating damage
                    if (roll === 6) {
                        let rolls2 = "";
                        let roll2;
                        do {
                            roll2 = randomInteger(6);
                            let p = damageChart[masterType][0][roll2];
                            penDamage += p;
                            rolls2 += "/" + roll2;
                        } while (roll2 === 6)
                        roll += rolls2;
                    }
                    rolls.push(roll);
                }
                let line;
                let tip = "Rolls: " + rolls.toString();
                tip += "<br>Dice: " + dice;
                tip += "<br>Chart: " + displayList;
                if (penDamage > 0) {
                    tip += "<br>Pen Chart: " + penList;
                }
                let hitTip = '[ Hits](#" class="showtip" title="' + tip + ')';       
                let missTip = '[ Misses](#" class="showtip" title="' + tip + ')';       
                if (hit === false) {
                    line = weaponType + missTip;
                    if (weapon.name) {
                        line = weapon.name + " " + line;
                    }
                } else {
                    if (parseInt(target.token.get("bar2_value")) === 0) {
                        damage += penDamage;
                        penDamage = 0;
                    }
                    line = weaponType + hitTip + ", doing " + (damage + penDamage) + " Damage";
                    if (weapon.name) {
                        line = weapon.name + " " + line;
                    }
                }
                outputCard.body.push(line);
                if (penDamage > 0) {
                    outputCard.body.push("[#ff0000][Shields Penetrated for " + penDamage + "][/#]");

                }
                info.normal += damage;
                info.pen += penDamage;
            }
            outputCard.body.push("[hr]");
            target.Damage(info);
        }


        _.each(weaponsFiring,pos => {
            log(pos)
            let numm = parseInt(pos) + 1;
            shooter.weaponArray[parseInt(pos)].status = "Fired";
            AttributeSet(shooter.charID,"weapon" + numm + "status","Fired");
        })
        if (state.FullThrust.shipState[shooter.id].targets.includes(target.id) === false) {
            state.FullThrust.shipState[shooter.id].targets.push(target.id);
        }

        let point1 = new Point(shooter.token.get("left"),shooter.token.get("top"));
        let point2 = new Point(target.token.get("left"),target.token.get("top"));
        let pageid = pageInfo.page.get('id');
        spawnFxBetweenPoints(point1, point2, fxObj.get("id"), pageid);

        PlaySound(sound);



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
        outputCard.body.push("X: " + hex.centre.x + " Y: " + hex.centre.y);


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



    const Combat = () => {
        turnorder = JSON.parse(Campaign().get("turnorder"));
        if (!turnorder) {return};
        //advance
        turnorder = JSON.parse(Campaign().get("turnorder"));
        let currentTurnItem = turnorder[0];
        if (!currentTurnItem) {return};

        let id = currentTurnItem.id;
        let ship = ShipArray[id];
        if (currentTurnItem.custom === "Turn") {
            state.FullThrust.turn = currentTurnItem.pr
        }
        //ping model's token
        if (ship) {
            //skip if on GM Layer
            if (ship.token.get("layer") === "objects") {
                toFront(ship.token);
                sendPing(ship.token.get("left"),ship.token.get("top"),Campaign().get("playerpageid"),null,true);
                ship.StartTurn();
            }
        } else {
            SetupCard("Turn " + state.FullThrust.turn,"","Neutral");
            //Start of Turn things
            PrintCard();
        }
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
            turn: 0,
            losLines: [],
            phase: 0,
            shipState: {},

        }

        

        Campaign().set("initiativepage",false);




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

   

    const StartGame = () => {
        let shipMasses = [];
        _.each(ShipArray,ship => {
            let info = {
                id: ship.id,
                mass: ship.mass,
            }
            shipMasses.push(info);
        })


        //sort shipMasses
        shipMasses = shipMasses.sort((a,b) => a.mass - b.mass);
        
        turnorder = [];
        Campaign().set("initiativepage",true);
        for (let i=0;i<shipMasses.length;i++) {
            turnorder.push({
                _pageid:    Campaign().get("playerpageid"),
                id:         shipMasses[i].id,
                pr:         shipMasses[i].mass,
            })
        }
        turnorder.unshift({
            _pageid:    Campaign().get("playerpageid"),
            id:         "-1",
            custom: "Turn",
            pr:         1,
            formula:    "+1",
        })
        Campaign().set("turnorder", JSON.stringify(turnorder));
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
            case '!StartGame':
                StartGame();
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
            case '!TestPics':
                TestPics();
                break;
            case '!Orders':
                Orders(msg);
                break;
            case '!Helm':
                Helm(msg);
                break;
            case '!RepBack':
                RepBack(msg);
                break;

        }
    };

   



    const registerEventHandlers = () => {
        on('chat:message', handleInput);
        //on("add:graphic", addGraphic);
        on('change:graphic',changeGraphic);
        on('destroy:graphic',destroyGraphic);
        on('change:campaign:turnorder',Combat);
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


