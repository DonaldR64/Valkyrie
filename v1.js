const Main = (() => {
    const version = '2026.7.22';
    if (!state.Valkyrie) {state.Valkyrie = {}};

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


    const KeyNum = (unit,keyword) => {
        let key = unit.keywords.split(",");
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
    const Attribute = (character,attributename) => {
        //Retrieve Values from character Sheet Attributes
        let attributeobj = findObjs({type:'attribute',characterid: character.id, name: attributename})[0]
        let attributevalue = "";
        if (attributeobj) {
            attributevalue = attributeobj.get('current');
        }
        return attributevalue;
    };

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

    const AttributeSet = (characterID,attributename,newvalue,max) => {
        if (!max) {max = false};
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
            //angle between 2 hexes
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
            this.tokenIDs = [];
            this.cube = offset.toCube();
            this.label = offset.label();
            this.offboard = false;
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

            this.id = id;
            this.charID = charID;
            let faction = aa.faction || "Neutral";
            this.faction = faction;
            let player = (state.Valkyrie.factions.indexOf(faction));
            if (player === -1) {
                if (faction === "Neutral") {
                    player = 2
                } else {
                    state.Valkyrie.factions.push(faction);
                    player = state.Valkyrie.factions.length - 1;
                }
            }
            this.player = player;

            this.class = aa.class;
            this.engine = parseInt(token.get("bar1_value"));
            this.engineMax = aa.engine_max;
            this.engineTransition = parseInt(aa.engineTransition);
            this.engineStatus = (engine >= engineTransition) ? "Green":(engine > 0) ? "Yellow":"Red";

            let hull = parseInt(token.get("bar2_value"));
            this.hullMax = parseInt(aa.hull_max) || 0;
            let hullStatus = "Red";
            if (hull > 1) {hullStatus = "Orange"};
            if (hull > 3) {hullStatus = "Yellow"};
            if (hull === hullMax) {hullStatus = "Green"};
            this.hullStatus = hullStatus;

            this.agile = (aa.agile === "1") ? true:false;
            this.speed = Math.ceil(this.engine * 4 / this.hullMax);

            this.shieldStatus = aa.shieldStatus;
            let shieldLevel = 0;
            if (this.shieldStatus === "Damaged") {
                shieldLevel = 1;
            }
            if (this.engineStatus !== "Green") {
                shieldLevel = Math.min(shieldLevel + 1, 2);
            }
            this.shieldLevel = shieldLevel;
            this.forShieldArray = aa.forShieldArray.split("/").map((e)=> parseInt(e));
            let forShield = forShieldArray[shieldLevel] || 0;
            let portShieldArray = aa.portShieldArray.split("/").map((e)=> parseInt(e));
            let portShield = portShieldArray[shieldLevel] || 0;
            let stbdShieldArray = values.stbdShieldArray.split("/").map((e)=> parseInt(e));
            let stbdShield = stbdShieldArray[shieldLevel] || 0;
            let aftShieldArray = values.aftShieldArray.split("/").map((e)=> parseInt(e));
            let aftShield = aftShieldArray[shieldLevel] || 0;

            let fsStatus = "Green";
            if (shieldLevel === 1) {fsStatus = "Orange"};
            if (shieldLevel === 2 || forShield === 0) {fsStatus = "Red"};
            let psStatus = "Green";
            if (shieldLevel === 1) {psStatus = "Orange"};
            if (shieldLevel === 2 || portShield === 0) {psStatus = "Red"};
            let ssStatus = "Green";
            if (shieldLevel === 1) {ssStatus = "Orange"};
            if (shieldLevel === 2 || stbdShield === 0) {ssStatus = "Red"};
            let asStatus = "Green";
            if (shieldLevel === 1) {asStatus = "Orange"};
            if (shieldLevel === 2 || aftShield === 0) {asStatus = "Red"};








            ShipArray[id] = this;
            let index = HexMap[label].tokenIDs.indexOf(id);
            if (index < 0) {
                HexMap[label].tokenIDs.push(id);
            }


        }

        Morale() {
            let target = this.quality;
            let tip = "Quality: " + target;
            let extra = [];

            let hero = this.Associated();
            if (hero && hero !== false) {
                if (hero.quality < target) {
                    tip = "Hero's Quality: " + hero.quality;
                    target = hero.quality;
                }
            }

            let auras = this.Auras();
            let moraleRoll = randomInteger(6);
            let shaken = (this.token.get("tint_color") === "#ff0000") ? true:false;

            if (this.keywords.includes("Hive Bond") || auras.includes("Hive Bond")) {
                if (this.keywords.includes("Hive Bond Boost") || auras.includes("Hive Bond Boost")) {
                    target -= 2;
                    tip += "<br>Hive Bond Boost +2";
                } else {
                    target--;
                    tip += "<br>Hive Bond +1";
                }
            }

            target = Math.min(6,Math.max(2,target));
            if (shaken === true) {target = 7};

            let success = (moraleRoll >= target) ? true:false;

            //fearless
            if (this.keywords.includes("Fearless") && success === false && shaken === false) {
                let fearlessRoll = randomInteger(6);
                let ftip = "Fearless Roll: " + fearlessRoll + " vs 4+";
                if (fearlessRoll > 3) {
                    ftip = '[Fearless](#" class="showtip" title="' + ftip + ')';
                    success = true;
                } else {
                    ftip = '[Not Fearless](#" class="showtip" title="' + ftip + ')';
                }
                extra.push(ftip);
            }




            //after failure changes - automatic
            if (this.keywords.includes("No Retreat") && success === false) {
                success = true;
                extra.push("The Test is still Passed due to No Retreat");
                let hp = parseInt(this.token.get("bar1_value"));
                let wounds = 0;
                let noRRolls = [];
                for (let i=0;i<hp;i++) {
                    let roll = randomInteger(6);
                    noRRolls.push(roll);
                    if (roll < 4) {wounds++};
                }
                noRRolls = noRRolls.sort((a,b) => b-a);
                let wtip = "Rolls: " + noRRolls.toString() + " vs. 4+";
                wtip = '[' + wounds + '](#" class="showtip" title="' + wtip + ')';
                extra.push("No Retreat causes " + wtip + " Wounds");
                hp = Math.max(0,hp - wounds);
                if (hp <= 0) {
                    this.Killed();
                    outputCard.body(this.name + " is Destroyed!");
                } else {
                    this.token.set("bar1_value",hp);
                }
            }

            SetupCard(this.name,"Morale",this.faction);

            outputCard.body.push("Morale Roll: " + DisplayDice(moraleRoll,this.faction,24) + " vs. " + target + "+");
            outputCard.body.push("[hr]");

            if (extra.length > 0) {
                _.each(extra,line => {
                    outputCard.body.push(line);
                })
            }
            if (success === true) {
                tip = '[Success!](#" class="showtip" title="' + tip + ')';
                outputCard.body.push(tip);
            } else {
                tip = '[Failure!](#" class="showtip" title="' + tip + ')';
                outputCard.body.push(tip);
                if (shaken === true) {
                    outputCard.body.push("Unit remains Shaken");
                } else {
                    outputCard.body.push("Unit is Shaken");
                }
                this.token.set("tint_color","#ff0000");
                if (this.token.get(SM.halfStr) === true) {
                    outputCard.body.push("If this was a Melee, Remove the Unit as it Routs!");
                }                        
            }
            PrintCard();
        }

        Auras() {
            ///checks if model or assoc hero has an active aura and returns their names

            let auras = this.keywords.filter((e) => e.includes("Aura")) || [];
            auras = auras.concat(this.TTip().filter((e) => e.includes("Aura")));
            let assoc = this.Associated();
            if (assoc && (this.type === "Infantry" || this.type === "Hero")) {
                auras = auras.concat(assoc.keywords.filter((e) => e.includes("Aura")));
                auras = auras.concat(assoc.TTip().filter((e) => e.includes("Aura")));
            }

            auras = auras.map((e) => e.replace(" Aura",""));
            auras = [...new Set(auras)];
            return auras;
        }

        Associated() {
            if (this.type !== "Infantry" && this.type !== "Hero") {return false};
            let hex = HexMap[this.hexLabel];
            let assoc = false;
            _.each(hex.tokenIDs,tokenID => {
                if (tokenID !== this.id) {
                    let unit2 = ShipArray[tokenID];
                    if (unit2 && unit2.faction === this.faction) {
                        assoc = unit2;
                    }
                }
            })
            return assoc;
        }

        TTip() {
            let tooltip = this.token.get("tooltip") || "";
            tooltip = tooltip.split(",");
            tooltip = tooltip.map((e) => e.trim());
            return tooltip;
        }

        SetTT(tip) {
            //sets one of the standard tooltips
            let tooltip = this.token.get("tooltip") || "";
            if (tooltip !== "") {tooltip += ","};
            tooltip += TT[tip];
            this.token.set("tooltip",tooltip);
            sendChat("",TT[tip] + " selected by " + this.name);
        }

        SetTT2(note) {
            //sets a specific note
            let tooltip = this.token.get("tooltip") || "";
            if (tooltip !== "") {tooltip += ","};
            tooltip += note;
            this.token.set("tooltip",tooltip);
        }



        RemoveTTip(tip) {
            let tooltip = this.token.get("tooltip") || "";
            tooltip = tooltip.split(",");
            tooltip = tooltip.map((e) => e.trim());
            tip = TT[tip] || tip;
            let index = tooltip.indexOf(tip);
            if (index > -1) {
                tooltip.splice(index,1);
                if (tooltip.length === 0) {
                    tooltip = "";
                } else {
                    tooltip = tooltip.toString();
                }
                this.token.set("tooltip",tooltip);
            }
        }

        Killed() {
            if (this.type === "Terrain") {
                this.token.set("bar1_value",0);
                DamagedTerrain(this.name,this.hexLabel);                
                delete ShipArray[this.id];
            } else {
                this.token.set({
                    "statusmarkers": "dead",
                    "layer": "map",
                })
                let index = HexMap[this.hexLabel].tokenIDs.indexOf(this.id);
                if (index > -1) {
                    HexMap[this.hexLabel].tokenIDs.splice(index,1);
                }
                delete ShipArray[this.id];


            }
        }

        RemoveBuffs(phase) {
            if (phase === "Defense") {
                let bffs = ["Resistance"];
                _.each(bffs,b => {
                    this.token.set(Buffs[b],false);
                })
            }
            if (phase === "Activation") {
                let TTlist = [TT.vAAP,TT.vATH,TT.vDD,TT.vDTH,];
                let markerList = [Buffs.AP1,Buffs.TH1,SM.evade,SM.laststand,];

                _.each(TTlist,tip => {
                    this.RemoveTTip(tip);
                });
                _.each(markerList,marker => {
                    this.token.set(marker,false);
                })
            }



        }

        Rotate(hex2) {
            let angle = Angle(HexMap[this.hexLabel].cube.angle(hex2.cube))
            this.token.set("rotation",angle);
        }

        KeyNum(keyword) {
            let match = this.keywords.find((e) => e.includes(keyword)) || "0";
            let num = parseInt(match.replace(/\D/g, ""));
            return num;
        }






        Dangerous() {
            this.token.set(Debuffs.dangerous,false);
            let hp = parseInt(this.token.get("bar1_value")) || 1;
            let fullStr = (hp > this.wounds/2) ? true:false;
            let rolls = [];
            let wounds = 0;
            for (let i=0;i<hp;i++) {
                let roll = randomInteger(6);
                rolls.push(roll);
                if (roll === 1) {wounds++};
            }
            let tip = "Rolls: " + rolls.sort().reverse().toString() + "<br>Takes Wounds on Rolls of 1";
            saveTypes = [
                {name: "Regeneration",target: 5, rolls: [],saved: 0,note: ""},
                {name: "Plaguebound",target: 6, rolls: [],saved: 0,note: ""},
                {name: "Protected",target: 6, rolls: [],saved: 0,note: ""},
                {name: "Resistance",target: 6, rolls: [],saved: 0, note: ""},
            ]
            if (this.keywords.includes("Plaguebound Boost") || this.Auras().includes("Plaguebound Boost") || this.token.get(Buffs["Plaguebound Boost"])) {
                saveTypes[1].target = 5;
                saveTypes[1].note = " Boost";
                this.token.set(Buffs["Plaguebound Boost"],false);
            }
            let saved = this.Saves(wounds);
            tip += saveTips();
            wounds -= saved;
            hp -= wounds;
            if (wounds === 0) {wounds = "No"}; 
            let s = (wounds === 1) ? "":"s";
            tip = '[' + wounds + '](#" class="showtip" title="' + tip + ')';
            outputCard.body.push("Unit takes " + tip + " Wound" +s);
            if (hp <= 0) {
                let verb = (this.type === "Hero" || this.type === "Infantry") ? " was killed!": " was destroyed!";
                outputCard.body.push(this.name + verb);
                this.Killed();
            } else {
                this.token.set("bar1_value",hp);
                if (hp <= (this.wounds/2)) {
                    this.token.set(SM.halfStr,true);
                    if (fullStr === true) {
                        let verb = (this.type === "Infantry") ? " has now taken heavy casualties!": " is now badly injured/damaged!";
                        outputCard.body.push(this.name + verb);
                    }
                    if (this.token.get("tint_color") !== "#ff0000") {
                        outputCard.body.push("The Unit must take a Morale Test");
                    }
                }
            }
        }



        Saves(wounds,ignoreRegen) {
            let auras = this.Auras();
            let saved = 0;
            for (let i=0;i<wounds;i++) {
                typeLoop:
                for (let t=0;t<saveTypes.length;t++) {
                    let type = saveTypes[t];
                    let name = type.name;
                    if (name === "Regeneration" && ignoreRegen) {continue};
                    if (this.keywords.includes(name) || auras.includes(name) || (Buffs[name] && this.token.get(Buffs[name]))) {
                        let roll = randomInteger(6);
                        saveTypes[t].rolls.push(roll);
                        if (roll >= type.target) {
                            saveTypes[t].saved++;
                            saved++;
                            break typeLoop; //next wound
                        }
                    }
                }
            }
            return saved;
        }





    }

    saveTips = function() {
        let tip = "";
        _.each(saveTypes,saveType => {
            if (saveType.rolls.length > 0) {
                tip += "<br>----------------";
                let s = (saveType.saved === 1) ? "":"s";
                let saved = (saveType.saved === 0) ? "No":saveType.saved;
                tip += "<br>" + saveType.name + saveType.note +" removed " + saved + " Wound" + s;
                tip += '<br>Rolls: ' + saveType.rolls.sort().reverse().toString() + " vs. " + saveType.target + "+";
            }
        })
        return tip;
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
        let unit = ShipArray[id];  
        if (!unit) {
            unit = new Unit(id);
        }
        AddAbilities2(unit)
    }
        
    const AddAbilities2 = (unit,unit2 = false) => {
        let keywordList = unit.keywords;
        let abilityName,action;
        let abilArray = findObjs({_type: "ability", _characterid: unit.charID});
        //clear old abilities
        for(let a=0;a<abilArray.length;a++) {
            abilArray[a].remove();
        } 
        
        let types = {
            "Rifle": [],
            "Pistol": [],
            "Heavy": [],
            "Heavy2": [],
            "Heavy3": [],
            "Mod": [],
            "Sniper": [],
            "Bomb": [],
            "Limited": [],
            "Limited2": [],
            "Limited3": [], 
            "CCW": [],
        }

        let sampled = unit;
        if (unit2 !== false) {
            sampled = unit2
        }

        for (let i=0;i<sampled.weapons.length;i++) {
            let weapon = sampled.weapons[i];
            let name = weapon.name;
            if (weapon.type === " " || weapon.name === " ") {continue}
            if (weapon.keywords.includes("Limited")) {
                name += " (Limited)";
            }
            if (unit2 !== false && weapon.type === "CCW" && weapon.keywords.includes("Destructive") === false) {
                continue;
            }
            if (unit2 !== false && weapon.ap === 0) {
                continue;
            }
            keywordList = keywordList.concat(weapon.keywords)
            types[weapon.type].push(name); 
        }
        
        let keys = Object.keys(types);
        let weaponNum = 1;


        for (let i=0;i<keys.length;i++) {
            let names = types[keys[i]];
            if (names.length === 0) {continue};
            let fx = "";
            let ccwTag = "";
            for (let j=0;j<sampled.weapons.length;j++) {
                if (keys[i] === "CCW") {
                    ccwTag = " [CCW]";
                    fx = "/fx bubbling-blood @{target|token_id}";
                    break;
                } else if (names[0].includes(sampled.weapons[j].name) && sampled.weapons[j].fx) {
                    let fxList = ["breath","beam","missile","rocket"];
                    let s = sampled.weapons[j].fx;
                    if (fxList.some(keyword => sampled.weapons[j].fx.includes(keyword))) {
                        fx = "/fx " + sampled.weapons[j].fx + " @{selected|token_id} @{target|token_id}";
                    } else {
                        fx = "/fx " + sampled.weapons[j].fx + " @{target|token_id}";
                    }
                    break;
                }
            }
            names = names.toString();
            if (names.charAt(0) === ",") {names = names.replace(",","")};
            names = names.replaceAll(",","+");
            abilityName = weaponNum + ccwTag + ": " + names;
            weaponNum += 1;
            action = "!Attack;@{selected|token_id};@{target|token_id};" + keys[i];
            action += '\n' + fx;

            if (unit2 !== false) {
                action = action.replaceAll("@{selected|token_id}",unit2.id);
                action = action.replaceAll("@{target|token_id}",unit.id);
            }

            let id = AddAbility(abilityName,action,unit.charID);

//limited on targets ?

            if (keys[i].includes("Limited")) {
                let info = {
                    key: keys[i],
                    id: id,
                }
                if (state.Valkyrie.limitedMacros[unit.id]) {
                    state.Valkyrie.limitedMacros[unit.id].push(info)
                } else {
                    state.Valkyrie.limitedMacros[unit.id] = [info];
                }
            }
        }

        if (unit2 === false) {
            //activation 
            let orders = ";?{Order|Hold|Advance|Charge/Rush|Rally|Overwatch}";
            if (unit.type === "Aircraft") {orders = ";Advance"};
            if (unit.keywords.includes("Artillery") || unit.keywords.includes("Immobile")) {orders = ";Hold|Rally|Overwatch"}

            action = "!Activate;@{selected|token_id}" + orders;
            AddAbility("Activate",action,unit.charID);


        //special ability macros
            let specials = [{name: "Dangerous Terrain Debuff", targets: 1, range: 9},{name: "Mend", targets: 1, range: 2},{name: "Piercing Shooting Mark", targets: 1, range: 9},{name: "Precision Spotter", targets: 1, range: 18},{name: "Steadfast Buff", targets: 1, range: 6},{name: "Rending Mark", targets: 1, range: 9},{name: "Bane in Melee Buff", targets: 1, range: 6},{name: "Speed Feat", targets: 1, range: 0},{name: "Speed Feat Aura", targets: 2, range: 0}];

            _.each(specials,special => {
                let t = "";
                if (unit.keywords.includes(special.name)) {
                    if (special.targets === "Self") {
                        t = ";@{selected|token_id}";
                    } else {
                        if (special.targets === 1) {
                            t = ";@{target|token_id}";
                        } else {
                            for (let i=1;i<=special.targets;i++) {
                                t += ";@{target|Target " + i + "|token_id}";
                            }
                        }
                    }
                    abilityName = unit.flavours[special.name];
                    action = "!Special;" + special.name + ";" + special.range + ";@{selected|token_id}" + t;
                    AddAbility(abilityName,action,unit.charID);
                }
            })


            //morale
            AddAbility("Morale","!Morale;" + unit.id,unit.charID);
            //Dangerous
            AddAbility("Dangerous","!DangerousTest",unit.charID);

            if (unit.casterLevel > 0) {
                action = "!CastSpell";
                AddAbility("Cast Spell",action,unit.charID);
            }

            //ambush
            if (unit.keywords.includes("Ambush")) {
                action = "!AmbushAura";
                AddAbility("Show Ambush Distance",action,unit.charID);
            }

            //place target
            if (weaponNum > 1) {
                AddAbility("Target Terrain","!PlaceTarget",unit.charID);
            }

            //LOS
            if (unit.type !== "Terrain" && unit.type !== "Objective") {
                AddAbility("LOS","!CheckLOS;@{selected|token_id};@{target|token_id}",unit.charID);
            }



            //keywords list 
            keywordList = [...new Set(keywordList)];
            keywordList = keywordList.filter(Boolean);
            keywordList = keywordList.map((e) => {
                if (e.includes("(")) {
                    e = e.split("(")[0] + "(X)";
                }
                let item = {
                    name: e,
                    text: Keywords[e] || "Not in Database",
                }
                return item;
            })
            
            keywordList = keywordList.sort((a,b) => a.name.localeCompare(b.name))
            for (let i=0;i<12;i++) {
                let abName = "spec" + i + "Name";
                let abTextName = "spec" + i + "Text";
                let name = " ";
                let text = " ";
                if (i < keywordList.length) {
                    name = keywordList[i].name;
                    text = keywordList[i].text;
                }


                AttributeSet(unit.charID,abName,name);
                AttributeSet(unit.charID,abTextName,text);
            }
        }
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
        AddTerrain();    
        AddTokens();
        _.each(HexMap,hex => {
            if (hex.centre.x >= mapEdge) {
                hex.offboard = true;
                hex.terrain = "Offboard";
                hex.type = "Offboard";
            }
        })

        let elapsed = Date.now()-startTime;
        log("Hex Map Built in " + elapsed/1000 + " seconds");
    };

    const AddTerrain = () => {
        //part 1 - add hex terrain
        let tokens = findObjs({_pageid: Campaign().get("playerpageid"),_type: "graphic",_subtype: "token",layer: "map",});
        _.each(tokens,token => {
            let name = token.get("name") || " ";
            if (name.includes("Map")) {
                mapEdge = Math.round(token.get("left") + (token.get("width")/2));
                return;
            }
            name = name.split("//")[0].trim();
            let terrain = TerrainInfo[name];
            if (terrain) {
                let centre = new Point(token.get("left"),token.get('top'));
                let centreLabel = centre.toCube().label();
                let hex = HexMap[centreLabel];
                if (hex) {
                    if (hex.terrain !== "Open") {
                        //burning/ruined
                        if (name === "Woods" && hex.terrain.includes("Burning Woods")) {
                            return;
                        }
                        if (name === "Orchards" && hex.terrain.includes("Burning Woods")) {
                            return;
                        }
                        if (name === "Crops" && hex.terrain.includes("Burning Crops")) {
                            return;
                        }
                        if (name === "Desert Scrub" && hex.terrain.includes("Burning Scrub")) {
                            return;
                        }
                        if (name.includes("Building") && hex.terrain.includes("Ruined")) {
                            return;
                        }
                        if (name === "Burning Woods") {
                            hex.terrain = hex.terrain.replace("Woods","Burning Woods");
                            hex.terrain = hex.terrain.replace("Orchards","Burning Woods");
                            hex.terrainID = "";
                            hex.breakable = false;
                            hex.flammable = false;
                        } else if (name === "Burning Scrub") {
                            hex.terrain = hex.terrain.replace("Desert Scrub","Burning Scrub");
                            hex.terrainID = "";
                            hex.breakable = false;
                            hex.flammable = false;
                        } else if (name === "Burning Crops") {
                            hex.terrain = hex.terrain.replace("Crops","Burning Crops");
                            hex.terrainID = "";
                            hex.breakable = false;
                            hex.flammable = false;
                        } else if (name.includes("Ruined")) { 
                            hex.terrain = hex.terrain.replace("Brick Building 1","Ruined Building");
                            hex.terrain = hex.terrain.replace("Brick Building 2","Ruined Building");
                            hex.terrain = hex.terrain.replace("Concrete Building 1","Ruined Concrete");                      
                            hex.terrain = hex.terrain.replace("Concrete Building 1","Ruined Concrete");
                            hex.terrainID = "";
                            hex.breakable = false;
                            hex.flammable = false;
                        } else {
                            hex.terrain += ", " + terrain.name;
                        }
                    } else {
                        hex.terrain = terrain.name;
                    }

                    hex.cover = (hex.cover === false) ? terrain.cover:false;
                    if (terrain.building === true) {
                        hex.building = true;
                    }
                    if (terrain.blockLOS === true) {
                        hex.blockLOS = true;
                    }
                    if (terrain.name.includes("Hill") === false) {
                        hex.terrainHeight = Math.max(hex.terrainHeight,terrain.height);
                    }
                    if (terrain.type !== "Open") {
                        hex.type = terrain.type;
                    }
                    if (terrain.name.includes("Hill")) {
                        hex.elevation = terrain.height;
                        hex.hill = true;
                    }
                    if (terrain.breakable && terrain.breakable === true) {
                        hex.breakable = true;
                        hex.terrainID = token.id;
                    }
                    if (terrain.flammable && terrain.flammable === true) {
                        hex.flammable = true;
                        hex.terrainID = token.id;
                    }
                }
            }






        })

        //part 2 - add hedges and crests, defined by paths
        let paths = findObjs({_pageid: Campaign().get("playerpageid"),_type: "pathv2",layer: "map",});
        _.each(paths,path => {
            let edge = EdgeInfo[path.get("stroke").toLowerCase()];
            if (edge) {
                let vertices = translatePoly(path);
                //work through pairs of vertices
                for (let i=0;i<(vertices.length -1);i++) {
                    let pt1 = vertices[i];
                    let pt2 = vertices[i+1];
                    let midPt = new Point((pt1.x + pt2.x)/2,(pt1.y + pt2.y)/2);
                    //find nearest hex to midPt
                    let hexLabel = midPt.label();
                    //now run through that hexes neighbours and see what intersects with original line to identify the 2 neighbouring hexes
                    let hex1 = HexMap[hexLabel];
                    if (!hex1) {continue}
                    let pt3 = hex1.centre;
                    let neighbourCubes = hex1.cube.neighbours();
                    for (let j=0;j<neighbourCubes.length;j++) {
                        let k = j+3;
                        if (k> 5) {k-=6};
                        let hl2 = neighbourCubes[j].label();
                        let hex2 = HexMap[hl2];
                        if (!hex2) {continue}
                        let pt4 = hex2.centre;
                        let intersect = lineLine(pt1,pt2,pt3,pt4);
                        if (intersect) {
                            hex1.edges[DIRECTIONS[j]] = edge;
                            hex2.edges[DIRECTIONS[k]] = edge;
                        }
                    }
                }
            }
            if (path.get("stroke").toLowerCase() === "#ffff00") {
                let vertices = translatePoly(path);
                for (let i=0;i<(vertices.length -1);i++) {
                    let pt1 = vertices[i];
                    let pt2 = vertices[i+1];
                    let hex1 = HexMap[pt1.label()];
                    let hex2 = HexMap[pt2.label()];
                    let phi = Angle(hex1.cube.angle(hex2.cube));
                    hex1.elevation += .25;
                    hex1.terrain += ", Ridgeline";
                    hex1.ridgeline = true;
                    if (hex1.ridgelineAngles.includes(phi) === false) {
                        hex1.ridgelineAngles.push(phi);
                    }
                    let interCubes = hex1.cube.linedraw(hex2.cube);
                    _.each(interCubes,cube => {
                        let hex3 = HexMap[cube.label()];
                        hex3.elevation += .25;
                        hex3.terrain += ", Ridgeline";
                        hex3.ridgeline = true;
                        if (hex3.ridgelineAngles.includes(phi) === false) {
                            hex3.ridgelineAngles.push(phi);
                        }
                    })
                }
            }



        })
    }
     
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
        let objectives = findObjs({
            _pageid: Campaign().get("playerpageid"),
            _type: "graphic",
            _subtype: "token",
            layer: "foreground",
        });
        let c = tokens.length + objectives.length;
        let s = (c===1) ? '':'s';    
        
        tokens.forEach((token) => {
            let character = getObj("character", token.get("represents"));   
            if (character) {
                let unit = new Unit(token.get("id"));
            }
        });
        objectives.forEach((token) => {
            let character = getObj("character", token.get("represents"));   
            if (character) {
                let unit = new Unit(token.get("id"));
            }
        });




        let elapsed = Date.now()-start;
        log(`${c} token${s} checked in ${elapsed/1000} seconds - ` + Object.keys(ShipArray).length + " placed in Unit Array");

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
        SetupCard("Start New Game","Turn 1","Neutral");
        _.each(ShipArray,unit => {
            if (unit.name.includes("Objective")) {
                let tsides = [unit.token.get("imgsrc")];
                tsides.push(tokenImage(Factions[state.Valkyrie.factions[0]].logo));
                tsides.push(tokenImage(Factions[state.Valkyrie.factions[1]].logo));
                tsides = tsides.toString().replaceAll(",","|");
                unit.token.set({
                    layer: 'foreground',
                    aura1_color: "#ffffff",
                    aura1_radius: .5,
                    sides: tsides,
                    currentSide: 0,
                })
            }
            unit.prevHexLabel = unit.hexLabel;
        })

        RemoveLines(["Deploy"]);
        PrintCard();
        state.Valkyrie.turn = 1;





    }

    const NextTurn = () => {
        RemoveDead();
        if (state.Valkyrie.turn === 0) {
            StartGame();
            return;
        }

        _.each(HexMap,hex => {
            let fix = [];
            let tIDs = hex.tokenIDs;
            _.each(tIDs,tID => {
                let unit = ShipArray[tID];
                if (unit && unit.token && unit.type !== "Terrain") {
                    fix.push(tID);
                } 
            })
            hex.tokenIDs = fix;
        })


        //check if any units havent activated
        let keys = Object.keys(ShipArray);

        let remaining = false;

        for (let i=0;i<keys.length;i++) {
            let unit = ShipArray[keys[i]];
            if (unit.faction === "Neutral") {continue};
            let token = unit.token;
            if (!token) {
                delete ShipArray[keys[i]];
                continue;
            }
            if (token && token.get("aura1_color") === Factions[unit.faction].objColour) {
                sendPing(token.get("left"),token.get("top"), Campaign().get('playerpageid'), null, true); 
                SetupCard(unit.name,"",unit.faction);
                outputCard.body.push("Unit has not been activated");
                PrintCard();
                remaining = true;
                break;
            }
        }
        if (remaining === true) {return};

        //things at beginning of turn
        let notes = [];
        keys = Object.keys(ShipArray);

        for (let i=0;i<keys.length;i++) {
            let unit = ShipArray[keys[i]];
            unit.prevHexLabel = unit.hexLabel;
            let unitTT = unit.TTip();
            let unitAuras = unit.Auras();
            if (unit.casterLevel > 0) {
                let sp = parseInt(unit.token.get("bar2_value"));
                sp = Math.min(6,sp + unit.casterLevel);
                unit.token.set("bar2_value",sp);
            }
            if (unit.token.get("aura1_color") !== "#ff00ff") {
                unit.token.set("aura1_color",Factions[unit.faction].objColour);
            }
            //Steadfast
            if ((unit.keywords.includes("Steadfast") || unitAuras.includes("Steadfast") || unitTT.includes("steadfast")) && (unit.token.get("tint_color") === "#ff0000")) {
                let steadRoll = randomInteger(6);
                if (steadRoll > 3) {
                    unit.token.set("tint_color","transparent");
                    if (unitTT.includes("steadfast")) {
                        unit.RemoveTTip("steadfast")
                        notes.push(unit.name + ": Rallies with Steadfast Buff");
                    } else {
                        notes.push(unit.name + ": Rallies with Steadfast");
                    }
                }
            }

            if (unit.name.includes("Objective")) {
                ObjectiveCheck(unit);
            }
            let markers = ["fatigue","AP1","TH1"]
            _.each(markers,marker => {
                unit.token.set(SM[marker],false);
            })



        }

        state.Valkyrie.turn += 1;
        let gameContinues = true;
        SetupCard("Turn " + state.Valkyrie.turn,"","Neutral");
        if (notes.length > 0) {
            _.each(notes,note => {
                outputCard.body.push(note);
            })
        }

        if (state.Valkyrie.turn > 6) {
            let roll = randomInteger(6);
            let needed = Math.min(state.Valkyrie.turn - 3,6);
            outputCard.body.push("Prolonged: " + roll + " vs. " + needed + "+");                
            if (roll < needed) {
                gameContinues = false;
                outputCard.body.push("The Battle Ends");
            } else {                    
                outputCard.body.push("The Battle continues for at least one more turn...");
            }
            outputCard.body.push("[hr]");
        } 
        if (gameContinues === true) {
            let lastUnit = ShipArray[state.Valkyrie.activeID];
            if (lastUnit) {
                outputCard.body.push(lastUnit.faction + " has the First Activation");
            } else {
                outputCard.body.push("The Faction that went last goes first this Turn");
            }
        } else {
            outputCard.body.push("The Game Ends");
        }
        PrintCard();
    }

    const ObjectiveCheck = (objective) => {
        let factions = [];
        let objHex = HexMap[objective.hexLabel];
        _.each(ShipArray, unit => {
            let unitHex = HexMap[unit.hexLabel];
            if (unit.type !== "Aircraft" && unit.token.get("tint_color") !== "#ff0000" && unit.id !== objective.id && unitHex.offboard === false) {
                let distance = objHex.distance(unitHex);
                if (distance < 2 && factions.includes(unit.faction) === false) {
                    factions.push(unit.faction)
                }
            }
        })
        if (factions.length === 1) {
            let f = state.Valkyrie.factions.indexOf(factions[0]) + 1;
            let img = tokenImage(objective.token.get("sides").split("|")[f]);
            objective.token.set({
                imgsrc: img,
                currentSide: f,
            })
        }
        if (factions.length === 2) {
            let img = tokenImage(objective.token.get("sides").split("|")[0]);
            objective.token.set({
                imgsrc: img,
                currentSide: 0,
            })
        }    
    }

    const Attack = (msg) => {

        const TerrainHits = () => {
            let terWeaponArray = [];
            for (let i=0;i<terrainHits.length;i++) {
                let weap = terrainHits[i];
                if (terWeaponArray.find((e) => e.name === weap.name)) {continue};
                if (weap.keywords.includes("Destructive") || iconAttack === true || (weap.keywords.includes("Flame") && defenderHex.flammable === true)) {
                    //attacks will be normal
                } else {
                    weap.attacks = terrainHits.filter((e) => e.name === weap.name).length; //# of misses, now used as # of attacks
                }
                if (combatType === "Melee" && weap.keywords.includes("Destructive") === false) {
                    continue;
                }
                terWeaponArray.push(weap);
            }
            let defender = ShipArray[defenderHex.terrainID];
            if (!defender) {
                defender = new Unit(defenderHex.terrainID);
            }
            defenders = [defender];
            outputCard.body.push("[B][U]" + defender.name + "[/u][/b]");
            _.each(terWeaponArray,weapon => {
                WeaponAttack(weapon,true);
            })
        }




        const DefenderSave = (defender,weapon) => {
            let defense = defender.defense;
            let defenseTip = "<br>Defense: " + defense + "+";
            let weaponAP = weapon.ap;
            let apTip = "<br>Weapon: AP " + weapon.ap;

            if (weapon.keywords.includes("Decimate") && defender.defense > 1 && defender.defense < 4) {
                weaponAP += 2;
                apTip += "<br>Decimate +2AP vs Defense 2-3";
            }
            if (attacker.token.get(Buffs.AP1) === true) {
                weaponAP ++;
                apTip += "<br>Unpredictable +1 AP";
            }
            if (weapon.keywords.includes("Tear") && defender.toughness > 8) {
                weaponAP += 4;
                apTip += "<br>Tear +4 AP";
            }
            if (defender.token && defender.token.get(SM.laststand)) {
                defense++;
                defenseTip += "<br>-1 Defense due to Last Stand";
            }


            if ((attacker.keywords.includes("Ranged Slayer") || attackerAuras.includes("Ranged Slayer")) && combatType === "Ranged" && defender.toughness > 2) {
                weaponAP += 2;
                apTip += "<br>Ranged Slayer +2 AP vs Tough 3+";
            }
            if ((attacker.keywords.includes("Slayer") || attackerAuras.includes("Slayer")) && defender.toughness > 2 && combatType !== "Spell") {
                if ((attacker.keywords.includes("Ranged Slayer") || attackerAuras.includes("Ranged Slayer"))) {
                    if (combatType === "Ranged") {
                        weaponAP += 2;
                        apTip += "<br>Ranged Slayer +2AP vs Tough 3+";
                    }
                } else {
                    weaponAP += 2;
                    apTip += "<br>Slayer +2AP vs Tough 3+";
                }
            }
            if (attacker.keywords.includes("Piercing Assault") && attacker.id === state.Valkyrie.activeID && combatType === "Melee") {
                weaponAP++;
                apTip += "<br>Piercing Assault +1 AP";
            }
            if (attackerAuras.includes("Piercing Fighting") && combatType === "Melee") {
                weaponAP++;
                apTip += "<br>Piercing Fighting +1 AP";
            }



            if (weapon.keywords.includes("Thrust") && attacker.id === state.Valkyrie.activeID && combatType === "Melee") {
                weaponAP++;
                apTip += "<br>Thrust +1 AP";
            }
            //versatile attack +1AP
            let vaapFlag = false;
            if (attackerTT.includes(TT.vAAP) && combatType !== "Spell") {
                weaponAP++;
                apTip += "<br>" + TT.vAAP;
                vaapFlag = true;
            }
            if (attackerAuras.includes("Versatile Attack") && vaapFlag === false && combatType !== "Spell") {
                let aH = attacker.Associated();
                if (aH && aH !== false) {
                    if (aH.TTip().includes(TT.vAAP)) {
                        weaponAP++;
                        apTip += "<br>" + TT.vAAP + " [Aura]";
                    }
                }
            }
            if (weapon.keywords.includes("Unstoppable") === false) {
                //versatile defense +1 defense
                let vddFlag = false;
                if (defender.TTip().includes(TT.vDD)) {
                    defense--;
                    defenseTip += "<br>" + TT.vDD;
                    vddFlag = true;
                }
                if (defender.Auras().includes("Versatile Defense") && vddFlag === false) {
                    let dH = defender.Associated();
                    if (dH && dH !== false) {
                        if (dH.TTip().includes(TT.vDD)) {
                            defense--;
                            defenseTip += "<br>" + TT.vDD + " [Aura]";
                        }
                    }
                }
                if (defender.type !== "Terrain" && losResult.building === true  && ((combatType === "Melee" && LargeUnits.includes(attacker.type)) || combatType === "Ranged")) {
                    defense--;
                    defenseTip += "<br>Building +1 Defense";
                }
                if (defender.keywords.includes("Shielded") && weapon.type !== "Spell") {
                    defense--;
                    defenseTip += "<br>Shielded +1 Defense";
                }

                if (weapon.ap > 0 && (defender.keywords.includes("Fortified") || defender.Auras().includes("Fortified"))) {
                    apTip += "<br>Fortified -1 to AP";
                    weaponAP += (weapon.ap -1);
                }
                if (weapon.ap > 0 && (defender.keywords.includes("Guardian") || defender.Auras().includes("Guardian"))) {
                    apTip += "<br>Guardian -1 to AP";
                    weaponAP += (weapon.ap -1);
                }


            } 

            let saveTarget = defense + weaponAP;
            let saveTip = defenseTip + apTip;

            let saveInfo = {
                saveTarget: saveTarget,
                saveTip: saveTip,
            }

            return saveInfo
        }


        const WeaponAttack = (weapon,terAttack = false) => {
            let hitRolls = [],missRolls = [], hits = 0; extraHits = 0; crits = 0;
            let relentless = 0,surge = 0, furious = 0,predator = 0,butcher = 0;
            let devout = 0,ferocious = 0;
            let ferBoost = false;
            let notes = [];
            let needed = attacker.quality;
            let neededTip = "<br>Quality: " + attacker.quality + "+";

            if (attacker.token.get(SM.fatigue) === true && combatType === "Melee") {
                needed = 6;
                neededTip = "<br>Fatigue: 6+";
            }
            //if shaken and attacking then is last stand (below) else if shaken and defending/attacking back is this
            if (attacker.token.get("tint_color") === "#ff0000" && state.Valkyrie.activeID !== attacker.id) {
                needed = 6;
                neededTip = "<br>Shaken and Fighting Back: 6+";
            }
            if (weapon.name === "Ravage") {
                needed = 6;
                neededTip = "<br>Ravage: 6+";
            }
            if (weapon.name === "Impact") {
                needed = 2;
                neededTip = "<br>Impact: 2+";
            }
            if (weapon.keywords.includes("Reliable")) {
                needed = 2;
                neededTip = "<br>Reliable: 2+";
            }
            if (attacker.token.get(SM.laststand) && state.Valkyrie.activeID === attacker.id) {
                needed++;
                neededTip += "<br>Last Stand -1";
            }
            if (combatType === "Spell") {
                needed = 1;
                neededTip = "<br>Spell - Auto Hit"
            }
            if (iconAttack === true) {
                needed -= 1;
                neededTip = "<br>Direct Attack vs. Terrain +1 to Hit";
            }

            let blast = weapon.keywords.find(key => key.includes("Blast")) || "0";
            blast = parseInt(blast.replace(/\D/g,''));

            let cover;
            let hitTip = "", tip;
            //modifiers here
            //cover
            let ignoreCover = ["Unstoppable","Blast","Slam","Decimate"];
            if (weapon.keywords.includes("Indirect")) {
                //ignores hedges etc
                cover = losResult.hexCover;
            } else {
                //if either edge or target terrain gives cover
                cover = (losResult.hexCover === true || losResult.interCover === true) ? true:false;
            }
            if (cover === true) {
                for (let i=0;i<weapon.keywords.length; i++) {
                    for (let j=0;j<ignoreCover.length;j++) {
                        if (weapon.keywords[i].includes(ignoreCover[j])) {
                            cover = false;
                            neededTip += "<br>" + ignoreCover[j] + " ignores Cover";
                        }  
                    }
                }  
            }

            //Positive To Hits
            if (attacker.keywords.includes("Artillery") && losResult.distance > 4) {
                needed -= 1;
                neededTip += "<br>Artillery at Range +1 to Hit";
            }
            if (attacker.token.get(Buffs.TH1) === true && combatType !== "Spell") {
                needed -= 1;
                neededTip += "<br>Unpredictable +1 to Hit";
            }
            if (attacker.order === "Hold" && combatType === "Ranged" && losResult.distance < 6) {
                needed -= 1;
                neededTip += "<br>Focused Fire +1 to Hit";
            }


            //versatile attack +1 to hit
            let vathFlag = false;
            if (attackerTT.includes(TT.vATH) && combatType !== "Spell") {
                needed -= 1;
                neededTip += "<br>" + TT.vATH;
                vathFlag = true;
            }
            if (attackerAuras.includes("Versatile Attack") && vathFlag === false && combatType !== "Spell") {
                let aH = attacker.Associated();
                if (aH && aH !== false) {
                    if (aH.TTip().includes(TT.vATH)) {
                        needed--;
                        neededTip += "<br>" + TT.vATH + " [Aura]";
                    }
                }
            }
            if (attacker.tokenID === state.Valkyrie.activeID && combatType === "Melee" && weapon.keywords.includes("Thrust")) {
                notes.push("Thrust");
                needed -= 1;
                neededTip += "<br>Thrust/Charge +1 to Hit";
            }
            if (attackerAuras.includes("Precision Charge") && attacker.tokenID === state.Valkyrie.activeID && combatType === "Melee") {
                needed -= 1;
                neededTip += "<br>Precision Charge +1 to Hit";
            }

            if (attacker.keywords.includes("Precise") && combatType !== "Spell") {
                needed -= 1;
                neededTip += "<br>Precise +1 to Hit";
            }
            if (attacker.keywords.includes("Targeting Visor") && losResult.distance > 4 && combatType !== "Spell") {
                if (attacker.keywords.includes("Targeting Visor Boost") || attackerAuras.includes("Targeting Visor Boost")) {
                    needed -= 2;
                    neededTip += "<br>Targeting Visor & Boost +2 to Hit";
                } else {
                    needed -= 1;
                    neededTip += "<br>Targeting Visor +1 to Hit";
                }
            }
            if (attacker.keywords.includes("Good Shot") && combatType === "Ranged") {
                needed--;
                neededTip += "<br>Good Shot +1 to Hit";
            }
/*
            if (defender.token.get(SM.spotter) === true || defender.token.get(SM.spotter) > 0 && combatType !== "Spell") {
                let spotter = 1;
                if (defender.token.get(SM.spotter) > 1) {
                    spotter = parseInt(defender.token.get(SM.spotter));
                }
                needed -= spotter;
                neededTip += "<br>Spotting Mark +" + spotter + " to Hit";
                defender.token.set(SM.spotter,false); //used
            }
*/
            //Negative To Hits - removed by Unstoppable
            if (weapon.keywords.includes("Unstoppable") === false) {
                if (cover === true && iconAttack === false && (combatType === "Ranged" || (combatType === "Melee" && LargeUnits.includes(attacker.type))))  {
                    needed += 1;
                    neededTip += "<br>Cover -1 to Hit";
                }
                if (weapon.keywords.includes("Indirect") && attacker.moved === true) {
                    needed += 1;
                    neededTip += "<br>Indirect and Moved -1 to Hit";
                }
                if ((defender.keywords.includes("Stealth") || defender.Auras().includes("Stealth")) && losResult.distance > 4) {
                    needed += 1;
                    neededTip += "<br>Stealth -1 to Hit";
                }
                //versatile defense -1 to hit
                let vdthFlag = false;
                if (defender.TTip().includes(TT.vDTH)) {
                    needed += 1;
                    neededTip += "<br>" + TT.vDTH;
                    vdthFlag = true;
                }
                if (defender.Auras().includes("Versatile Defense") && vdthFlag === false) {
                    let dH = defender.Associated();
                    if (dH && dH !== false) {
                        if (dH.TTip().includes(TT.vDTH)) {
                            needed += 1;
                            neededTip += "<br>" + TT.vDTH  + " [Aura]";
                        }
                    }
                }
                if (attacker.token.get("aura1_color") === "#ff00ff") {
                    needed++;
                    neededTip += "<br>Overwatch -1 to Hit";
                }

                if (attacker.keywords.includes("Evasive")) {
                    needed++;
                    neededTip += "<br>Evasive -1 to Hit";
                }
                if (defender.keywords.includes("Artillery") && losResult.distance > 4) {
                    needed += 2;
                    neededTip += "<br>Artillery being shot at > 4 hexes";
                }

                if (attacker.keywords.includes("Bad Shot") && combatType === "Ranged") {
                    needed++;
                    neededTip += "<br>Bad Shot -1 to Hit";
                }
                if (defender.token.get(SM.evade)) {
                    needed++;
                    neededTip += "<br>Hunkering Down -1 to Hit";
                }


            }

            if (terAttack === true && iconAttack === false) {
                needed = 4;
                neededTip = "<br>Collateral vs. Terrain - 4+";
            }

            //Number of Attacks
            let attacks = weapon.number * weapon.attacks;

            if (attacker.token.get(SM.halfStr) === true  && combatType !== "Spell" && attacker.type !== "Hero") {
                attacks = Math.floor(attacks/2);
            }
            if (attacks === 0) {
                attacks = 1;
                needed += 1;
                if (attacker.type === "Infantry") {
                    neededTip += "<br>Heavy Casualties -1 to Hit";
                } else {
                    neededTip += "<br>Unit Damaged -1 to Hit";
                }
            }
                    /*
                    needs fixing
                                if (weapon.name === "Impact" && defender.keywords.includes("Counter")) {
                                    attacks -= defender.models;
                                }
                    */


            attDisplay = attacks; //as attacks is deprecated
            if (combatType !== "Spell") {
                needed = Math.min(6,Math.max(2,needed)); //1 is always a miss, 6 a hit
            }

            if (terAttack === true && iconAttack === false) {
                attacks = weapon.attacks;
            }



            do {
                let roll = randomInteger(6);
                if (roll >= needed) {
                    hitRolls.push(roll);
                    hits++;
                    if (roll === 6) {
                        crits++;
                        if ((attacker.keywords.includes("Relentless") || attackerAuras.includes("Relentless")) && losResult.distance > 4 && combatType !== "Spell") {
                            relentless++;
                        }
                        if (weapon.keywords.includes("Surge")) {
                            surge++;
                        }
                        if (attacker.keywords.includes("Devout") && combatType !== "Spell") {
                            devout++;
                        }
                        if (attacker.keywords.includes("Furious") || attackerAuras.includes("Furious")) {
                            furious++;
                        }
                        if (attacker.keywords.includes("Predator Fighter") && combatType !== "Spell") {
                            predator++;
                            let roll = randomInteger(6);
                            if (roll >= needed) {
                                hitRolls.push(roll);
                                if (roll === 6) {crits++}
                                extraHits++;
                                hits++;
                            } else {
                                missRolls.push(roll);
                            }
                        }
                        if (weapon.keywords.includes("Butcher")) {
                            butcher++;
                        }
                    }
                    if (roll === 5) {
                        if (combatType !== "Spell" && attacker.keywords.includes("Ferocious") && (attacker.keywords.includes("Ferocious Boost") || attackerAuras.includes("Ferocious Boost") || attacker.token.get(Buffs["Ferocious Boost"]))) {
                            ferocious++;
                            ferBoost = true;
                        }
                    }





                } else {
                    missRolls.push(roll);
                    let proceed = false;
                    if (dfFlag === false && defenderHex.breakable === true && weapon.ap > 0 && weapon.type !== "Sniper" && combatType === "Ranged") {
                        //dfFLag is true if already added
                        terrainHits.push(weapon);
                    }
                }

                if (weapon.keywords.includes("Indirect") && weapon.keywords.find((e) => e.includes("Blast")) && weapon.ap > 0 && defenderHex.type === "Open") {
                    PlaceCraters(defenderHex);
                }
                attacks--;
            } while (attacks > 0);

            let s;


            if (iconAttack === false && terAttack === true) {
                butcher = 0;
                furious = 0;
                relentless = 0;
                surge = 0;
                devout = 0;
                ferocious = 0;
            }

            if (predator > 0) {
                s = (predator === 1) ? "":"s";
                hitTip += "<br<Predator Fighter added " + predator + " Attack" + s;
            }
            if (butcher > 0) {
                s = (butcher === 1) ? "":"s";
                hits += butcher;
                hitTip += "<br<Butcher added " + butcher + " hit" + s;
            }
            if (furious > 0) {
                hits += furious;
                s = (furious === 1) ? "":"s";
                hitTip += "<br>Furious added " + furious + " hit" + s;
            }
            if (relentless > 0) {
                hits += relentless;
                s = (relentless === 1) ? "":"s";
                hitTip += "<br>Relentless added " + relentless + " hit" + s;
            }
            if (surge > 0) {
                hits += surge;
                s = (surge === 1) ? "":"s";
                hitTip += "<br>Surge added " + surge + " hit" + s;
            }
            if (devout > 0) {
                hits += devout;
                s = (devout === 1) ? "":"s";
                hitTip += "<br>Devout added " + devout + " hit" + s;
            }
            if (ferocious > 0) {
                hits += ferocious;
                let add = "";
                s = (ferocious === 1) ? "":"s";
                if (ferBoost === true) {add = " Boost"};
                hitTip += "<br>Ferocious" + add + " added " + ferocious + " hit" + s;
            }


            extraHits += butcher + furious + relentless + surge + devout + ferocious;

            if (blast > 0 && hits > 0) {
                let blastHits = Math.min(defenderModels,blast);
                if (terAttack === true) {
                    blastHits = blast;
                }
                if (blastHits > 1) {
                    //if 1 model, blast does no extra hits
                    let extra = (blastHits - 1) * hits;
                    extraHits += extra;
                    hitTip += "<br>Blast adds " + extra + " hits"
                    hits += extra;
                }
            }

            let h = hitRolls.length === 1 ? " Hit: ":" Hits: ";
            let m = missRolls.length === 1 ? " Miss: ":" Misses: ";

            finalTip = hitRolls.length + h + hitRolls.sort().reverse().toString();
            finalTip += "<br>" + missRolls.length + m + missRolls.sort().reverse().toString();
            if (extraHits > 0) {
                finalTip += "<br>Total Extra Hits: " + extraHits;
            }
            finalTip += "<br>vs. Target: " + needed + "+";
            finalTip += "<br>----------------";
            finalTip += neededTip + hitTip;
            let weaponOut;
            if (hits > 0) {
                s = (hits === 1) ? "":"s";
                weaponOut = '[' + hits + '](#" class="showtip" title="' + finalTip + ')';
            } else {
                s = "s";
                let word = (terAttack === true) ? "No":"Zero";
                weaponOut = '['+ word + '](#" class="showtip" title="' + finalTip + ')';
            }
            
            let s2 = (weapon.number === 1) ? "s ":" ";
            let s3 = (weapon.number === 1) ? "":"s";

            let attWord = ((combatType === "Ranged") ? " fire":" strike") + s2;

            if (terAttack === true) {
                let adverb = (iconAttack === true) ? " Direct Hit": " Collateral Hit";
                outputCard.body.push(weapon.name + " gets " + weaponOut + adverb + s);
            } else {
                outputCard.body.push(weapon.name + attWord + attDisplay + " time" + s3);
                outputCard.body.push(weaponOut + " hit" + s + " scored");
            }

            if (weapon.keywords.includes("Limited")) {
                let lids = state.Valkyrie.limitedMacros[attacker.id];
                for (let l=0;l<lids.length;l++) {
                    let info = lids[l];
                    if (info.key === weapon.type) {
                        let abil = findObjs({_type: "ability", _id: info.id})[0];
                        if (abil) {abil.remove()};
                    }
                }
            }

            for (let d=0;d<defenders.length;d++) {
                defender = defenders[d];
                if (!defender) {continue}
                if (hits === 0) {continue};
                let saveInfo = DefenderSave(defender,weapon);
                let hp = parseInt(defender.token.get("bar1_value"));
                let totalWounds = 0;
                let savePass = [];
                let saveFail = [];
                let bane = 0, shred = 0, slam = 0, rending = 0;
                let deadlyWeapon = false, deadlyNum = 1;
                let ignoreRegenList = ["Bane","Butcher","Rending","Unstoppable"];
                let ignoreRegen = ignoreRegenList.find((e) => weapon.keywords.includes(e));
                if (defender.TTip().includes("Rending Mark")) {
                    ignoreRegen = "Rending Mark";
                    RemoveTTip("Rending Mark");
                }
                if (defender.token.get(Debuffs["Rending Against"])) {
                    ignoreRegen = "Rending Against Debuff";
                    defender.token.set(Debuffs["Rending Against"],false);
                }

                if (ignoreRegen && (defender.keywords.includes("Regeneration") || defender.Auras().includes("Regeneration"))) {
                    saveInfo.saveTip += "<br>Regeneration ignored due to " + ignoreRegen;
                }
                saveTypes = [
                    {name: "Regeneration",target: 5, rolls: [],saved: 0,note: ""},
                    {name: "Plaguebound",target: 6, rolls: [],saved: 0,note: ""},
                    {name: "Protected",target: 6, rolls: [],saved: 0,note: ""},
                    {name: "Resistance",target: 6, rolls: [],saved: 0, note: ""},
                ]

                if (defender.keywords.includes("Plaguebound Boost") || defender.Auras().includes("Plaguebound Boost") || defender.token.get(Buffs["Plaguebound Boost"])) {
                    saveTypes[1].target = 5;
                    saveTypes[1].note = " Boost";
                    defender.token.set(Buffs["Plaguebound Boost"],false);
                }
                if (weapon.type === "Spell") {
                    saveTypes[3].target = 2;
                    saveTypes[3].note = " vs. Spell";
                }

                do {
                    let wounds = 0;
                    let saveRoll = randomInteger(6);
                    let target = saveInfo.saveTarget;
                    if (crits > 0) {
                        if (weapon.keywords.includes("Rending") || ignoreRegen && ignoreRegen.includes("Rending")) {
                            rending++;
                            target += 4;
                        }
                    }
                    target = Math.min(6,Math.max(2,target));
                    if (saveRoll === 6) {
                        if (weapon.keywords.includes("Bane")) {
                            saveRoll = randomInteger(6); //take 2nd roll regardless
                            bane++;
                        }
                    }

                    if (saveRoll >= target) {
                        savePass.push(saveRoll);
                    } else {
                        saveFail.push(saveRoll);
                        let wounds = 1;
                        let deadly = weapon.keywords.find((e) => e.includes("Deadly"));
                        if (deadly) {
                            wounds = parseInt(deadly.replace(/\D/g,''));
                            wounds = Math.min(wounds,defender.toughness);
                            deadlyWeapon = true;
                            deadlyNum = wounds;
                        }

                        if (saveRoll === 1) {
                            if (weapon.keywords.includes("Shred")) {
                                shred++;
                                wounds++;
                            }
                            if (weapon.keywords.includes("Shred when Shooting") && combatType === "Ranged") {
                                shred++;
                                wounds++;
                            }
                            if (weapon.keywords.includes("Slam")) {
                                slam++;
                                wounds++;
                            }
                        }

                        //for each wound, check regen etc
                        saved = defender.Saves(wounds,ignoreRegen);
                        wounds -= saved;
                        totalWounds += wounds;
                        hp -= wounds;

                    }

                    crits--;
                    hits--;
                } while (hits > 0 && hp > 0);

                let saveTip = saveInfo.saveTip;
                let s;
                if (deadlyWeapon && deadlyNum > 1) {
                    saveTip += "<br>Deadly: " + deadlyNum + " Wounds per hit";
                }
                if (rending > 0) {
                    s = (rending === 1) ? "":"s";
                    saveTip += "<br>Rending affected " + rending + " Save" + s;
                }
                if (bane > 0) {
                    s = (bane === 1) ? "":"s";
                    saveTip += "<br>Bane caused " + bane + " Save Reroll" + s;
                }
                if (shred > 0) {
                    s = (shred === 1) ? "":"s";
                    saveTip += "<br>Shred added " + shred + " Wound" + s;
                }
                if (slam > 0) {
                    s = (slam === 1) ? "":"s";
                    saveTip += "<br>Slam added " + slam + " Wound" + s;
                }

                //display results, adjust hp of defender
                finalTip = savePass.length + " Saves: " + savePass.sort().reverse().toString();
                finalTip += '<br>' + saveFail.length + " Failed: " + saveFail.sort().reverse().toString();
                finalTip += "<br>vs. Target: " + Math.min(6,Math.max(2,saveInfo.saveTarget)) + "+";

                finalTip += saveTips();
                finalTip += "<br>----------------";
                finalTip += saveTip;

                meleeWounds += totalWounds;
                if (totalWounds > 0) {
                    s = (totalWounds) ? "":"s";
                    saveOut = '[' + totalWounds + '](#" class="showtip" title="' + finalTip + ')';
                } else {
                    saveOut = '[Zero](#" class="showtip" title="' + finalTip + ')';
                }

                if (d===1) {
                    outputCard.body.push("[hr]");
                }
                let noun = " Wounds";
                if (defender.type === "Terrain") {
                    noun = " Damage";
                }

                outputCard.body.push(defender.name + ' suffers ' + saveOut + noun);

                defender.RemoveBuffs("Defense");
                if (hp > 0) {
                    defender.token.set("bar1_value",hp);
                    if (hp <= Math.floor(defender.wounds/2) && totalWounds > 0) {
                        if (defender.type !== "Terrain") {
                            defender.token.set(SM.halfStr,true);
                            if (defender.type !== "Hero") {
                                moraleCheck = true;
                            }
                        } else {
                            cID = "-OxDiGwwCt6-g2vdUauU";
                            let smoke = summonToken(cID,defenderHex.centre.x,defenderHex.centre.y);
                            toFront(smoke);
                        }


                        
                    }
                } else {
                    defendersAliveFlag[d] = false;
                    let verb = (defender.type === "Infantry" || defender.type === "Hero") ? " was killed":" was destroyed";
                    if (defender.name.includes("Woods") || defender.name.includes("Crops")) {
                        verb = " was set on Fire!";
                    }
                    if (defender.name.includes("Concrete")) {
                        verb = " collapses, taking any adjacent Building Hexes with it!";
                    }
                    if (defender.name.includes("Brick")) {
                        verb = " collapses!";
                    }


                    outputCard.body.push(defender.name + verb);
                    moraleCheck = false;
                    defender.Killed();
                }
                //if hits are > 0 then will apply them to hero if there is one
                //if hits are 0 then will hit the continue above
            } //end defenders loop




        } //end WeaponAttack

        let Tag = msg.content.split(";");
        let attacker = ShipArray[Tag[1]];
        let defender = ShipArray[Tag[2]];
        let iconAttack = (defender.name === "Icon") ? true:false;
        let dfFlag = false;

        if (!attacker || !defender) {return};
        let weaponType = Tag[3]; //CCW, Rifle etc
        let weapon;

        if (weaponType.includes("Spell") === false) {
            SetupCard(attacker.name,"Attack",attacker.faction);
        }


        let attackerHex = HexMap[attacker.hexLabel];
        let defenderHex = HexMap[defender.hexLabel];
    
        let friendly = false;
        //due to overlap, check if accidentally clicked own unit
        if (attacker.faction === defender.faction) {
            friendly = true;
            _.each(defenderHex.tokenIDs,tokenID => {
                let unit2 = ShipArray[tokenID];
                if (unit2.faction !== attacker.faction) {
                    defender = unit2;
                    friendly = false;
                }
            })
        } 
        //if hero, check if shuld be a normal unit, if so change
        if (defender.type === "Hero" && defenderHex.tokenIDs.length > 1 && weaponType.includes("Sniper") === false) {
            _.each(defenderHex.tokenIDs,tokenID => {
                let unit2 = ShipArray[tokenID];
                if (unit2.faction === defender.faction && unit2.id !== defender.id && unit2.type !== "Hero") {
                    defender = unit2;
                }
            })
        }   

        let attackerAuras = attacker.Auras();
        let attackerTT = attacker.TTip();
        let defenderModels = Math.ceil(parseInt(defender.token.get("bar1_value"))/defender.toughness);

        let defenders = [defender];
        let defendersAliveFlag = [defender.id];
        if (weaponType.includes("Sniper") === false) {
            let defenderHero = defender.Associated();
            if (defenderHero !== false) {
                defenderModels++
                defenders.push(defenderHero)
                defendersAliveFlag.push(defenderHero.id);
            }
        }


        //error checks
        let errorMsg = [];
        if (friendly === true) {
            errorMsg.push("Friendly Fire!");
        }     

        //Weapons - los, ranges, limited
        let losResult = LOS(attacker,defender);
        let combatType = (weaponType === "CCW") ? "Melee":(weaponType.includes("Spell")) ? "Spell":"Ranged";
        

        let unpredictable = (attacker.keywords.includes("Unpredictable")) ? true:false;
        if (combatType === "Melee" && (attacker.keywords.includes("Unpredictable Fighter") || attackerAuras.includes("Unpredictable Fighter"))) {
            unpredictable = true;
        }
        if (combatType === "Ranged" && (attacker.keywords.includes("Unpredictable Shooter") || attackerAuras.includes("Unpredictable Shooter"))) {
            unpredictable = true;
        }
        if (unpredictable === true && combatType !== "Spell") {
            attacker.token.set(Buffs.AP1,false);
            attacker.token.set(Buffs.TH1,false);
            let roll = randomInteger(6);
            if (roll > 3) {
                attacker.token.set(Buffs.AP1,true);
            } else {
                attacker.token.set(Buffs.TH1,true);
            }
        }

        let weaponArray = [];
        if (combatType !== "Spell") {
            let notEligible = []; //weapons not eligible for various reasons
            for (let i=0;i<attacker.weapons.length;i++) {
                weapon = DeepCopy(attacker.weapons[i]);
                let notE;
                if (weapon.type !== weaponType) {continue};
                if (weapon.name === "Impact" && attacker.id !== state.Valkyrie.activeID) {
                    notE = weapon.name + " only for Charging Unit";
                }
                if (weapon.name === "Impact" && attacker.token.get(SM.fatigue) === true) {
                    notE = "Fatigue limits Impact";
                }
                if (attacker.id !== state.Valkyrie.activeID && combatType !== "Melee" && attacker.token.get("aura1_color") !== "#ff00ff") {
                    notE = "Can only fire Ranged Weapons if Active Unit";
                } 
                if (weapon.type === "CCW" && losResult.distance > 1) {
                    notE = "Not in Melee Range";
                }
                if (losResult.los === false && weapon.keywords.includes("Indirect") === false) {
                    notE = weapon.name + " - no LOS";
                }
                let range = (defender.type === "Aircraft" && weapon.keywords.includes("Unstoppable") === false) ? weapon.range - 6:weapon.range;
                if (attacker.keywords.includes("Increased Shooting Range") || attackerAuras.includes("Increased Shooting Range")) {
                    range += 3;
                }
                if (losResult.distance > range && combatType === "Ranged" && weapon.type !== "CCW") {
                    notE = weapon.name + " - lacks Range";
                    if (losResult.notes.length > 1 && losResult.notes.includes("Ranged Shrouding")) {
                        notE += "[Ranged Shrouding in effect]";
                    }
                }
                if (iconAttack === true) {
                    let proceed = false;
                    if (defenderHex.breakable === true && weapon.ap > 0 && weapon.type !== "Sniper") {proceed = true};
                    if (proceed === false && defenderHex.flammable === true && (weapon.keywords.includes("Flame") || weapon.keywords.includes("Destructive"))) {proceed = true};
                    if (proceed === false) {
                        notE = weapon.name + " - unable to Damage this Terrain";
                    }
                }

                if (notE) {
                    notEligible.push(notE)
                } else {
                    if (weapon.keywords.includes("Deadly")) {
                        weaponArray.unshift(weapon);                
                    } else {
                        weaponArray.push(weapon);                
                    }

                }
            }





            if (weaponArray.length === 0) {
                errorMsg = errorMsg.concat(notEligible);
            }
            if (ErrorMsg(errorMsg) === true) {
                PrintCard();
                return;
            }
        } else if (combatType === "Spell") {
            let spellInfo = Spells[spellCast.spellName];
            weapon = {
                number: 1,
                name: spellCast.spellName,
                type: "Spell",
                range: spellInfo.range,
                attacks: spellInfo.hits,
                ap: spellInfo.ap || 0,
                keywords: spellInfo.keywords || [""],
                fx: spellInfo.fx,
                sound: spellInfo.sound,
            }
            weaponArray.push(weapon);
        }

        let meleeWounds = 0;
        let moraleCheck = false;

        let terrainHits = [];

        _.each(weaponArray,weapon => {
            dfFlag = false;
            //terrain
            if ((weapon.keywords.includes("Destructive") && defenderHex.breakable === true) || (weapon.keywords.includes("Flame") && defenderHex.flammable === true) || iconAttack === true) {
                terrainHits.push(weapon);
                dfFlag = true; //flag to stop misses being added
            }
            if (iconAttack === false && defendersAliveFlag.some((e) => e !== false)) {
                WeaponAttack(weapon);
                outputCard.body.push("[hr]");
                PlaySound(weapon.sound);
                FX(weapon.fx,attackerHex,defenderHex);
            }
        })

        if (terrainHits.length > 0) {
            TerrainHits();
        }

        if (moraleCheck === true && (combatType === "Ranged" || combatType === "Spell")) {
            _.each(defendersAliveFlag,id => {
                if (id !== false) {
                    let u2 = ShipArray[id];
                    if (u2.type !== "Hero" && u2.token.get("tint_color") !== "#ff0000") {
                        outputCard.body.push("[hr]")
                        outputCard.body.push(u2.name + " must take a Morale Check");
                        ButtonInfo("Morale Check","!Morale;" + id)
                    }
                }
            })
        }

        if (combatType === "Melee" && defendersAliveFlag.some((e)=> e !== false) && iconAttack === false) {
            let fear = attacker.KeyNum("Fear");
            if (fear > 0) {
                fear = " + Fear " + fear + " = " + (fear + meleeWounds);
            } else {
                fear = "";
            }
            outputCard.body.push("For Purpose of Combat Resolution");
            outputCard.body.push(attacker.name + " caused " + meleeWounds + fear + " Wounds");
        }

        //remove these things
        let things = ["AP1","TH1","Ferocious Boost"];
        _.each(things,thing => {
            attacker.token.set(Buffs[thing],false);
        })
        if (attacker.token.get("aura1_color") === "#ff00ff") {
            attacker.token.set("aura1_color","transparent");
        }

        if (combatType === "Melee") {
            attacker.token.set(SM.fatigue,true);
            if (attacker.id === state.Valkyrie.activeID ) {
                attacker.token.set("aura1_color","transparent");
            }
        }
      

        if (attacker.type !== "Aircraft") {
            attacker.Rotate(defenderHex);
        }


        //spells printed by Cast4
        if (combatType !== "Spell") {
            PrintCard();
        }
    }




    const PlaceTarget = (msg) => {
        if (!msg.selected) {
            sendChat("","No Unit Selected");
            return;
        }
        let id = msg.selected[0]._id;
        let unit = ShipArray[id];
        if (id !== state.Valkyrie.activeID) {
            sendChat("","Unit has to Activate");
            return;
        }
        let oldTarget = ShipArray[state.Valkyrie.targetID];
        if (oldTarget) {
            oldTarget.token.remove();
            delete ShipArray[state.Valkyrie.targetID];
        }

        let hex = HexMap[unit.hexLabel];
        let cID = "-OxDpUN1kl9gvdLwyKN1";
        let icon = summonToken(cID,hex.centre.x,hex.centre.y,105,0,"objects");
        if (icon) {
            targetUnit = new Unit(icon.get("id"));
            state.Valkyrie.targetID = targetUnit.id;
            AddAbilities2(targetUnit,unit);
            toFront(icon);
        }
    }







    const PlaceCraters = (hex) => {
        //place graphic
        let cIDs = ["-OhNIW12IYL36oEBZO2A","-OhNI9XVYd1EHy1sEc6e"];
        let cID = cIDs[randomInteger(2) - 1];
        let crater = summonToken(cID,hex.centre.x,hex.centre.y,105,(randomInteger(6) - 1) * 60);
        toFront(crater);
        //change info in hex
        if (hex.terrain === "Open") {
            hex.terrain = "Artillery Craters";
        } else {
            hex.terrain += ", Artillery Craters";
        }
        if (hex.cover === false) {hex.cover = "Infantry"};
        hex.type = "Difficult";
    }

    const DamagedTerrain = (name,hexLabel) => {
        let cID;
        let hex = HexMap[hexLabel];
        let collapse = false;
        let surround = false;
        let hexes = [hex];
        let units = [];
        _.each(hex.tokenIDs,tokenID => {
            let unit = ShipArray[tokenID];
            if (unit && unit.type !== "Terrain" && unit.type !== "System" && unit.token) {
                units.push(unit);
            }
        })
        let type,terrainHeight
        let blockLOS = false;

        if (name.includes("Woods")) {
            cID = "-OhNGbWrGVzigHCAytih";
            newName = "Burning Woods";
            terrainHeight = 25;
            blockLOS = true;
        }
        if (name.includes("Orchards")) {
            cID = "-OhNGbWrGVzigHCAytih";
            newName = "Burning Woods";
            terrainHeight = 25;
            blockLOS = true;
        }
        if (name.includes("Crops")) {
            cID = "-Ox7_Am1NUBlEDOMx9Zn";
            newName = "Burning Crops";
            terrainHeight = 10;
            blockLOS = true;
        }


        if (name.includes("Brick")) {
            cID = "-OhNJMSCrMgwndDoYCH4";
            newName = "Ruined Building";
            terrainHeight = buildingLevelHeight * .5;
            collapse = true;
        }
        if (name.includes("Concrete")) {
            cID = "-OhNLNwgdI6SjQ9WUHRw";
            newName = "Ruined Concrete";
            terrainHeight = buildingLevelHeight * .5;
            collapse = true;
            surround = true;
        }

        if (surround === true) {
            //check surrounding hexes, add up ids
            let cubes = hex.cube.neighbours();
            _.each(cubes,cube => {
                let label = cube.label();
                let hex2 = HexMap[label];
                if (hex2.building === true) {
                    hexes.push(hex2);
                    _.each(hex2.tokenIDs,tokenID => {
                        let unit = ShipArray[tokenID];

                        if (unit && unit.type !== "Terrain" && unit.type !== "System" && unit.token) {
                            units.push(unit);
                        }
                    })
                }
            })
        }

        _.each(hexes,hex => {
            let dt = summonToken(cID,hex.centre.x,hex.centre.y,140,(randomInteger(6)-1) * 60);
            toFront(dt);
            let terList = hex.terrain.split(",");
            let element = terList.find((e) => e.includes(name));
            let index = terList.indexOf(element);
            terList.splice(index,1);
            terList.push(newName);
            hex.terrain = terList.toString();
            hex.breakable = false;
            hex.flammable = false;
            hex.building = false;
            hex.blockLOS = blockLOS;
            hex.type = "Dangerous";
            hex.terrainHeight = terrainHeight;
            hex.terrainID = "";
        })

        _.each(units,unit => {
            let ext = "";
            if (unit.token.get("tint_color") !== "#ff0000" && collapse === true) {
                ext = " and is also Shaken";
                unit.token.set("tint_color","#ff0000");
            }
            outputCard.body.push(unit.name + " must take a Dangerous Terrain Test, moving out of the Hex" + ext);
        })














    }





    const SetupGame = (msg) => {
        let Tag = msg.content.split(";");
        let deployment = Tag[1];
        let mission = Tag[2];
        SetupCard("Game Info","","Neutral");
        RemoveLines(["Deploy","LOS"]);
        outputCard.body.push("[hr]");
        outputCard.body.push("[B]Deployment Info[/b]");
        DeploymentZones(deployment);
        outputCard.body.push("[hr]");
        outputCard.body.push("[B]Mission Info[/b]");
        MissionInfo(mission);  
        PrintCard();
    }



    const Morale = (msg) => {
        let id = msg.content.split(";")[1];
        let unit = ShipArray[id];
        if (!unit) {return};
        unit.Morale();
    }

  


    const Activate = (msg) => {
        let Tag = msg.content.split(";"); 
        let id = Tag[1];
        let order = Tag[2];
        let unit = ShipArray[id];
        if (!unit) {return};
        if (unit.type !== "Titan") {
            toFront(unit.token);
        }
        if (unit.keywords.includes("Ambush")) {
            unit.token.set({
                aura2_color: "transparent",
                aura2_radius: 0,
                showplayers_aura2: false,
            })
        }

        if (unit.token.get("aura1_color") === "transparent") {
            SetupCard(unit.name,"Change Order ?",unit.faction);
            outputCard.body.push("Unit has Activated already, ?Redo")
            ButtonInfo("Redo Order","!RedoOrder;" + unit.id + ";" + order);
            PrintCard();
        } else {
            ActivateTwo(unit,order);
        }
    }

    const ActivateTwo = (unit,order) => {
        //clear placed target icons
        let oldTarget = ShipArray[state.Valkyrie.targetID];
        if (oldTarget) {
            oldTarget.token.remove();
            delete ShipArray[state.Valkyrie.targetID];
        }
        
        SetupCard(unit.name,order,unit.faction);
        let unitAuras = unit.Auras();
        let unitTT = unit.TTip();
        let addBreak = false;
        let ignoreDifficult = false;
        let shaken = (unit.token.get("tint_color") === "#ff0000") ? true:false;
        RemoveDead();
        state.Valkyrie.activeID = unit.id;
        let boundMove = false;

        if ((unit.keywords.includes("Bounding") || unitAuras.includes("Bounding")) && order !== "Rally") {
            let roll = randomInteger(2);
            boundMove = true;
            outputCard.body.push("Bound - The Unit may immediately be placed anywhere within " + roll + " Hexes")
        }

        unit.RemoveBuffs("Activation");


        outputCard.subtitle = order;
        unit.token.set("aura1_color","transparent");
        if (unit.type === "Hero") {
            toFront(unit.token);
        }


        let move = 3;
        let preface = [];


        if (unit.keywords.includes("Fast")) {
            addBreak = true;
            move++
            preface.push("Unit has Fast and has +1 to Move");
        };
        if (unit.keywords.includes("Very Fast")) {
            addBreak = true;
            move += 2
            preface.push("Unit has Very Fast and has +2 to Move");
        }
        if (unit.keywords.includes("Slow")) {
            addBreak = true;
            move--;
            preface.push("Unit has Slow and has -1 to Move");
        }





    //other modifiers

        let charge = move * 2;
        let rush = move * 2;

        if (unit.keywords.includes("Agile") && order === "Charge/Rush") {
            charge += 1, rush+= 1;
            preface.push("Unit has Agile gets +1 Hex to Charge/Rush");
        }
        if ((unit.keywords.includes("Rapid Charge") || unitAuras.includes("Rapid Charge") && order === "Charge/Rush")) {
            preface.push("Unit has Rapid Charge gets +2 Hexes to Charge");
            charge += 2;
        }
        if ((unit.keywords.includes("Rapid Rush") || unitAuras.includes("Rapid Rush") || unit.token.get(Buffs["Rapid Rush"])) && order === "Charge/Rush") {
            preface.push("Unit has Rapid Rush and gets +3 Hexes to Rush");
            rush += 3;
        }

        if (unit.keywords.includes("Strider") && order !== "Hold" && order !== "Rally") {
            preface.push("Unit has Strider and may ignore the effects of Difficult Terrain");
            ignoreDifficult = true;
        }
        if ((unit.keywords.includes("Flying") || unit.keywords.includes("Fly"))) {
            preface.push("Unit has Flying and may Ignore Terrain and Units while Moving");
            ignoreDifficult = true;
        }
        if (unit.type === "Aircraft") {
            if (shaken === true) {order = "Rally"};
            addBreak = true;
            ignoreDifficult = true;
            outputCard.body.push("Unit is an Aircraft and Ignores Units and Terrain");
        }
        if (unit.token.get(Buffs.speedFeat) === true) {
            preface.push("The Unit has Speed Feat Active and Added");
            move += 1;
            charge += 2, rush+= 2;
            unit.token.set(Buffs.speedFeat,false);
            unit.SetTT2("Speed Feat Used");
        }
        if (shaken === true && order !== "Rally") {
            lastStand = true;
            addBreak = true;
            outputCard.body.push("The Unit is taking a Last Stand!");
            if (unit.type !== "Aircraft") {
                outputCard.body.push("It Moves at 1/2 Speed");
                move = Math.round(move/2);
                charge = Math.round(charge/2);
                rush = Math.round(rush/2);
            }
        }

        if (order !== "Rally" && order !== "Hold") {
            _.each(preface,line => {
                outputCard.body.push(line);
            })
            addBreak === true;
        }
        if (addBreak === true) {
            outputCard.body.push("[hr]");
        }


        let difMove = (ignoreDifficult === false) ? Math.min(move,3):move;
        let difCharge = (ignoreDifficult === false) ? Math.min(charge, 3): charge;
        let difRush = (ignoreDifficult === false) ? Math.min(rush,3): rush;

        let startHex = HexMap[unit.hexLabel];

        if (unit.type === "Aircraft") {
            move = "15-18";
            difMove = move;
        }

        let situation = 1; //open
        if ((startHex.type === "Difficult" || unit.token.get(Debuffs["Difficult Terrain"]))&& ignoreDifficult === false) {situation = 2};
        if (startHex.building === true && ignoreDifficult === false) {situation = 3}; //building


        switch(order) {
            case 'Hold':
                outputCard.body.push("Unit stays in Place and may Fire");
                break;
            case 'Advance':
                if (situation === 3) {
                    outputCard.body.push("Unit starts in a Building");
                    outputCard.body.push("Advance is " + difMove + " Hexes, to a maximum of 3 Hexes from any part of the Building");
                }
                if (situation === 2) { //difficult
                    outputCard.body.push("Unit starts in Difficult Ground");
                    outputCard.body.push("Advance is " + difMove + " Hexes");
                }
                if (situation === 1 || boundMove === true) { //open
                    if (boundMove === true && situation !== 1) {
                        let line = "If the Unit bounded out of the ";
                        if (situation === 3) {
                            line += "Building: "
                        } else if (situation === 2) {
                            line += "Difficult Ground:";
                        }
                        outputCard.body.push(line);
                    }
                    outputCard.body.push("Advance is " + move + " Hexes");
                    if (difMove !== move) {
                        outputCard.body.push("Entering or Crossing Difficult Terrain limits Advance to " + difMove + " Hexes");
                    }
                }
                break;
            case 'Charge/Rush':
                if (situation === 3) {
                    outputCard.body.push("Unit starts in a Building");
                    if (difCharge !== difRush) {
                        outputCard.body.push("Charge is " + difCharge + " Hexes");
                        outputCard.body.push("Rush is " + difRush + " Hexes");
                    } else {
                        outputCard.body.push("Charge/Rush is " + difCharge + " Hexes");
                    }
                    outputCard.body.push("To a maximum of 3 Hexes from any part of the Building");
                }
                if (situation === 2) {
                    outputCard.body.push("Unit starts in Difficult Ground");
                    if (difCharge !== difRush) {
                        outputCard.body.push("Charge is " + difCharge + " Hexes");
                        outputCard.body.push("Rush is " + difRush + " Hexes");
                    } else {
                        outputCard.body.push("Charge/Rush is " + difCharge + " Hexes");
                    }
                }

                if (situation === 1 || boundMove === true) {
                    if (boundMove === true && situation !== 1) {
                        let line = "If the Unit bounded out of the ";
                        if (situation === 3) {
                            line += "Building: "
                        } else if (situation === 2) {
                            line += "Difficult Ground:";
                        }
                        outputCard.body.push(line);
                    }
                    if (charge === rush) {
                        outputCard.body.push("Charge/Rush is " + charge + " Hexes");
                    } else {
                        outputCard.body.push("Charge is " + charge + " Hexes, Rush is " + rush + " Hexes");
                    }
                    if (difCharge !== charge || difRush !== rush) {
                        if (difCharge === difRush) {
                            outputCard.body.push("Entering or Crossing Difficult Terrain limits Charge/Rush to " + difCharge + " Hexes");
                        } else {
                            outputCard.body.push("Entering/Crossing Difficult Terrain limits Charge to " + difCharge + " Hexes and Rush to " + difRush + " Hexes");
                        }
                    }
                }


                if ((unit.keywords.includes("Hit & Run Shooter")) || unitAuras.includes("Hit & Run Shooter")) {
                    outputCard.body.push("The Unit may move up to 2 Hexes after Shooting");
                }
                if ((unit.keywords.includes("Hit & Run Fighter")) || unitAuras.includes("Hit & Run Fighter")) {
                    outputCard.body.push("The Unit may move up to 2 Hexes after Melee");
                }
                if ((unit.keywords.includes("Hit & Run")) || unitAuras.includes("Hit & Run")) {
                    outputCard.body.push("The Unit may move up to 2 Hexes after Shooting or Melee");
                }
                unit.token.set(Buffs["Rapid Rush"],false);


                break;
            case 'Rally':
                if (unit.type !== "Aircraft") {
                    outputCard.body.push("Unit Stays in Hex and Rallies, Hunkering Down against Fire");
                } else {
                    outputCard.body.push("Aircraft moves " + move + " Hexes");
                    outputCard.body.push("As the Aircraft is Rallying, it may not Fire, but is Evading as it moves");
                }
                unit.token.set("tint_color","transparent");
                unit.token.set(SM.evade,true);
                unit.token.set(SM.laststand,false);
                break;

            case 'Overwatch':
                outputCard.body.push("Unit is now on Overwatch until its next activation");
                unit.token.set("aura1_color","#ff00ff");
                break;
        }


        if ((unit.keywords.includes("Versatile Attack") || unit.keywords.includes("Versatile Attack Aura")) && order !== "Charge/Rush" && order !== "Rally") {
            let aur = (unit.keywords.includes("Versatile Attack Aura")) ? " Aura":"";
            outputCard.body.push("Unit has Versatile Attack" + aur);
            let buttons = [];
            buttons.push({
                phrase: "Choose +1 AP",
                action: "!SetTT;" + unit.id + ";vAAP",
            })
            buttons.push({
                phrase: "Choose +1 to Hit",
                action: "!SetTT;" + unit.id + ";vATH",
            })
            outputCard.body.push(InlineButtons(buttons));
        }
        if (unit.keywords.includes("Versatile Defense") || unit.keywords.includes("Versatile Defense Aura")) {
            let aur = (unit.keywords.includes("Versatile Defense Aura")) ? " Aura":"";
            outputCard.body.push("Unit has Versatile Defense" + aur);
            let buttons = [];
            buttons.push({
                phrase: "Choose +1 Defense",
                action: "!SetTT;" + unit.id + ";vDD",
            })
            buttons.push({
                phrase: "Choose -1 to Hit",
                action: "!SetTT;" + unit.id + ";vDTH",
            })
            outputCard.body.push(InlineButtons(buttons));
        }

        unit.order = order;
        unit.token.set(Debuffs["Difficult Terrain"],false)


        PrintCard();


    }

    const RedoOrder = (msg) => {
        let Tag = msg.content.split(";");
        let id = Tag[1];
        let order = Tag[2];
        let unit = ShipArray[id];
        let prevHex = HexMap[unit.prevHexLabel];
        unit.token.set({
            left: prevHex.centre.x,
            top: prevHex.centre.y,
        })
        ActivateTwo(unit,order);
    }

    const SetTT = (msg) => {
        let Tag = msg.content.split(";");
        let id = Tag[1];
        let unit = ShipArray[id];
        if (!unit) {return};
        let tip = Tag[2];
        unit.SetTT(tip);
    }



    const DangerousTest = (msg) => {
        let id = msg.selected[0]._id;
        let unit = ShipArray[id];
        if (!unit) {return};
        SetupCard(unit.name,"Dangerous Test",unit.faction);
        unit.Dangerous();
        PrintCard();
    }

    const Special = (msg) => {
        let Tag = msg.content.split(";");
        let specialName = Tag[1];
        let range = Tag[2]
        let unit = ShipArray[Tag[3]];
        let unitHex = HexMap[unit.hexLabel];
        let targets = [];
        let errorMsg = [];
        let targetHex;
        for (let i=4;i<Tag.length;i++) {
            let target = ShipArray[Tag[i]];
            if (!target) {continue};
            let losResult = LOS(unit,target);
            if (losResult.distance > range) {
                errorMsg.push(target.name + " Is Out of Range");
            }
            if (losResult.los === false) {
                errorMsg.push(target.name + " is not in LOS");
            }
            targets.push(target);
            targetHex = HexMap[target.hexLabel];
            if (targetHex.tokenIDs.length > 1) {
                _.each(targetHex.tokenIDs,tokenID => {
                    if (tokenID !== target.id) {
                        targets.push(ShipArray[tokenID]);
                    }
                })
            }
        }

        if (unit.token.get("tint_color") === "#ff0000") {
            errorMsg.push("Unit is Shaken");
        }

        let flavour = unit.flavours[specialName] || specialName;
        SetupCard(unit.name,flavour,unit.faction);
        if (ErrorMsg(errorMsg) === true) {
            PrintCard();
            return;
        }

        if (specialName === "Dangerous Terrain Debuff") {
            for (let i=0;i<targets.length;i++) {
                let target = targets[i];
                if (i>0) {outputCard.body.push("[hr]")};
                target.token.set(Debuffs.dangerous,true);
                outputCard.body.push(target.name + " now has a Dangerous Terrain Debuff");
                outputCard.body.push("The next time it moves, it will have to take a Dangerous Terrain Test");
                FX("burst-slime",unitHex,targetHex);
                PlaySound("Squelch");
            }
        }
        if (specialName === "Mend") {
            let roll = randomInteger(3);
            let s = (roll === 1) ? "":"s";
            let hp = parseInt(targets[0].token.get("bar1_value"));
            let max = targets[0].wounds - hp;
            let healed = Math.min(max,roll);
            hp += healed;
            targets[0].token.set("bar1_value",hp);
            let tip = "Roll: " + roll;
            tip = '[' + targets[0].name + '](#" class="showtip" title="' + tip + ')';
            if (hp === targets[0].wounds) {
                outputCard.body.push(tip + " has been fully healed/repaired");
            } else {
                outputCard.body.push(tip + " is healed/repaired for " + healed + " Wound" + s);
            }
            if (hp > targets[0].wounds/2) {
                targets[0].token.set(SM.halfStr,false);
            }
        }

        //just placing the special name in tooltip
        let tipList = ["Bane in Melee Buff","Rending Mark"];
        if (tipList.includes(specialName)) {
            _.each(targets,target => {
                target.SetTT2(specialName);
                outputCard.body.push(target.name + " now has " + specialName);
            })
        }
        if (specialName.includes("Speed Feat")) {
            _.each(targets,target => {
                let tt = target.TTip();
                if (tt.includes("Speed Feat Used")) {
                    outputCard.body.push(target.name + " Has already Used Speed Feat this game");
                } else {
                    target.token.set(Buffs.speedFeat,true);
                    outputCard.body.push("Unit has Speed Feat activated");
                }
            })
        }







        PrintCard();

    }

    const RemoveLines2 = () => {
            RemoveLines()
    }


    const RemoveLines = (which = ["LOS","Deploy"]) => {
        _.each(which,lines => {
            let array;
            if (lines === "LOS") {
                array = state.Valkyrie.losLines;
            }
            if (lines === "Deploy") {
                array = state.Valkyrie.deployLines;
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
                    state.Valkyrie.losLines.push(line.get("id"))
                } else {
                    state.Valkyrie.deployLines.push(line.get("id"));
                }
            }
        }
    }






    const DeploymentZones = (random = "No") => {

//set for flat hexes
        let styles = ["Frontline","Frontline","Frontline","Ground War","Ground War","Side Battle","Side Battle","Disordered","Spearhead","Opposing Forces","No Man's Land","No Man's Land","Long Haul","Long Haul","Flank Assault","Meeting Engagement"];

        let roll = (random === "Yes") ? randomInteger(styles.length) - 1:0;
        let style = styles[roll];
        let styleInfo;

        let pH = pageInfo.height;
        let pts = [];
        let hW = HexInfo.width;
        let xS = HexInfo.xSpacing;
        let hH = HexInfo.height;
        //vertical - use hex height hH
        //horizontal - is 1  * hex width + (distance - 1) * xSpacing

        switch (style) {
            case 'Frontline': 
                styleInfo = "Top or Bottom";
                pts.push([[0,6*hH],[mapEdge,6*hH]])
                pts.push([[0,pH-(6*hH)],[mapEdge,pH-(6*hH)]]);
                break;
            case 'Ground War':
                styleInfo = "Left or Right";
                pts.push([[(hW + (11*xS)),0],[(hW + (11*xS)),pH]]);
                pts.push([[mapEdge - (hW + (11*xS)),0], [mapEdge - (hW + (11*xS)),pH]])
                break;
            case 'Side Battle':
                styleInfo = "Bottom or Top Corner";
                pts.push([[0,pH - (14.5 * hH)],[(27*xS),pH]]);
                pts.push([[mapEdge - (27*xS),0],[mapEdge,14.5*hH]]);
                break;
            case 'Disordered':
                styleInfo = "Top or Bottom Corners";
                pts.push([[0,pH/2],[mapEdge/2,0]]);
                pts.push([[0,pH/2],[mapEdge/2,pH]]);
                pts.push([[mapEdge/2,0],[mapEdge,pH/2]]);
                pts.push([[mapEdge/2,pH],[mapEdge,pH/2]]);
                break;
            case 'Spearhead': 
                styleInfo = "Left or Right";
                pts.push([[0,0],[hW + (11*xS),pH/2]]);
                pts.push([[0,pH],[hW + (11*xS),pH/2]]);
                pts.push([[mapEdge - hW -(11*xS),pH/2],[mapEdge,0]]);
                pts.push([[mapEdge - hW -(11*xS),pH/2],[mapEdge,pH]]);
                break;
            case 'Opposing Forces':
                styleInfo = "Left or Right";
                pts.push([[0,pH/2],[hW + (11*xS),pH/2]]);
                pts.push([[hW + (11*xS),pH/2],[hW + (11*xS),0]]);
                pts.push([[mapEdge - hW - (11*xS),pH],[mapEdge - hW - (11*xS),pH/2]]);
                pts.push([[mapEdge - hW - (11*xS),pH/2],[mapEdge,pH/2]]);
                break;
            case "No Man's Land":
                styleInfo = "Top or Bottom";
                pts.push([[0,3*hH],[mapEdge,3*hH]])
                pts.push([[0,pH-(3*hH)],[mapEdge,pH-(3*hH)]]);
                break;
            case 'Long Haul':
                styleInfo = "Left or Right";
                pts.push([[(hW + (5*xS)),0],[(hW + (5*xS)),pH]]);
                pts.push([[mapEdge - (hW + (5*xS)),0], [mapEdge - (hW + (5*xS)),pH]])
                break;
            case 'Flank Assault':
                styleInfo = "Top or Bottom";
                pts.push([[0,pH/2],[hW + (5*xS),pH/2]]);
                pts.push([[hW + (5*xS),pH/2],[hW + (5*xS),pH - (6*hH)]]);
                pts.push([[hW + (5*xS),pH - (6*hH)],[mapEdge,pH - (6*hH)]]);
                pts.push([[0,6*hH],[mapEdge - hW - (5*xS),6*hH]]);                
                pts.push([[mapEdge - hW - (5*xS),6*hH],[mapEdge - hW - (5*xS),pH/2]]);
                pts.push([[mapEdge - hW - (5*xS),pH/2],[mapEdge,pH/2]]);
                break;
            case 'Meeting Engagement':
                styleInfo = "Top or Bottom";
                pts.push([[0,6*hH],[hW + (11*xS),6*hH]]);
                pts.push([[hW + (11*xS),6*hH],[hW + (11*xS),0]]);
                pts.push([[0,pH - (6*hH)],[hW + (11*xS),pH - (6*hH)]]);
                pts.push([[hW + (11*xS),pH - (6*hH)],[hW + (11*xS),pH]]);
                pts.push([[mapEdge - hW - (11*xS),0],[mapEdge - hW - (11*xS),6*hH]]);
                pts.push([[mapEdge - hW - (11*xS),6*hH],[mapEdge,6*hH]]);
                pts.push([[mapEdge - hW - (11*xS),pH],[mapEdge - hW - (11*xS),pH - (6*hH)]]);
                pts.push([[mapEdge - hW - (11*xS),pH - (6*hH)],[mapEdge,pH - (6*hH)]]);
                break;
        }

        _.each(pts,set => {
            DrawLine(set);
        })

        outputCard.body.push("Deployment: " + style);
        outputCard.body.push("Dice Roll, winner picks " + styleInfo + " and Deploys First");

    }

    const MissionInfo = (random = "No") => {
        let missions = ["Duel","Duel","Duel","Duel","Seize Ground","Relic Hunt","Pitched Battle","Capture and Hold"];
        let roll = (random === "Yes") ? randomInteger(missions.length) - 1 :0;
        let mission = missions[roll];
        let missionInfo,number;

        switch (mission) {
            case "Duel":
                number = randomInteger(3) + 2;
                missionInfo = "After the game ends, the player that controls the most markers wins";
                break;
            case 'Seize Ground':
                number = 4;
                missionInfo = "Divide the non-deployment area into 4 equal quarters, placing one objective at the centre of each. After the game ends, the player that controls the most markers wins";
                break;
            case 'Relic Hunt':
                number = 3;
                missionInfo = "The Objectives represent highly important Relics of some kind. If a unit seizes a Objective, remove it from the table, and it counts as being carried by the unit. If the unit is shaken or destroyed at any point, the marker is dropped within 1” (placed by the opponent). When the game ends, the player that controls most markers wins."
                break;
            case 'Pitched Battle':
                number = randomInteger(3) + 2;
                missionInfo = "At the end of EACH round, players get 1VP for each objective they control, and at the end they get an additional 1 VP if they control more markers than their opponent.";
                break;
            case 'Capture and Hold':
                number = 3;
                missionInfo = "The Objectives represent important Information or Personnel. If a unit seizes a Objective, remove it from the table, and it counts as being carried by the unit. If the unit is shaken or destroyed at any point, the marker is dropped within 1 hex (placed by the opponent). At the end of EACH round, players get 1VP for each objective they control, and at the end they get an additional 1 VP if they control more markers than their opponent."
                break;
        }

        outputCard.body.push("Mission: " + mission);
        outputCard.body.push("Place " + number + " Objectives");
        outputCard.body.push(missionInfo);

    }


    const SetArmies = () => {
        //resets all tokens to base levels, makes sure theyre in arrays etc
        //renames also
        let tokens = findObjs({
            _pageid: Campaign().get("playerpageid"),
            _type: "graphic",
            _subtype: "token",
            layer: "objects",
        });
        let tokens2 = findObjs({
            _pageid: Campaign().get("playerpageid"),
            _type: "graphic",
            _subtype: "token",
            layer: "foreground",
        });
        tokens = tokens.concat(tokens2);
        let names = {};

        for (let i=0;i<tokens.length;i++) {
            let token = tokens[i];
            let unit = ShipArray[token];
            let character = getObj("character", token.get("represents"));   
            let name = character.get("name");
            let tsides = token.get("sides").split("|");
            if (name.includes("Objective")) {
                let tsides = token.get("sides").split("|");
                token.set({
                    aura1_color: "#ffffff",
                    aura1_radius: 2.45,
                    showplayers_aura1: true,
                    aura1_square: false,
                    tint_color: "transparent",
                    layer: "objects",
                    currentSide: 0,
                    imgsrc: tokenImage(tsides[0]) || "",
                })
            };
            if (!unit) {
                unit = new Unit(token.get("id"));
                if (!unit.faction || name.includes("Objective")) {
                    unit.faction === "Neutral";
                    continue;
                }
            }
            let auraShape = true;
            let ds = false;
            if (unit.type === "Hero") {
                let name = HeroNames(unit);
                unit.name = name;
                unit.token.set("name",name);
                toFront(unit.token);
                auraShape = false;
                ds = true;
            } else {
                name = name.split("//")[0].trim();
                if (names[name]) {
                    names[name]++;
                    unit.name = name + " " + names[name];
                } else {
                    unit.name = name;
                    names[name] = 1;
                }
                unit.token.set("name",unit.name); 
            }

            let a1c = Factions[unit.faction].objColour || "#ffffff";

            unit.token.set({
                bar1_value: unit.wounds,
                bar1_max: unit.wounds,
                showplayers_bar1: true,
                aura1_color: a1c,
                aura1_radius: 0.1,
                aura2_color: "transparent",
                showplayers_aura1: true,
                tooltip: "",
                show_tooltip: true,
                showplayers_tooltip: true,
                showplayers_name: true,
                statusmarkers: "",
                aura1_square: auraShape,
                tint_color: "transparent",
                disableSnapping: ds,
            })
            if (unit.casterLevel > 0) {
                unit.token.set({
                    bar2_value: unit.casterLevel,
                    bar2_max: 6,
                    showplayers_bar2: true,
                })
            };


            AddAbilities2(unit)


        }







    }



    const HeroNames = (unit) => {
        let name = "";
        let charName = getObj("character", unit.token.get("represents")).get("name");

        let factionNames = {
            "Plague Disciples": ["Blight","Pustus","Bilegore","Cachexis","Clotticus","Colathrax","Corpulux","Poxmaw","Dragan","Festardius","Fethius","Fugaris","Gangrous","Rotheart","Glauw","Leprus","Kholerus","Malarrus","Necrosius","Phage"],
            "Dao Union": ["Shi'ur","Por'o","Kai","Vor","Shi","Ru","Ni","Chi-Ha","Tor-lak"],
            "Alien Hives": ["Swarmlord","Deathleaper","Old One-Eye","The Doom of Vasta","Razor"],
            "Orks": ["Blaktoof","Teef Pulla", "Klawfist","Ghazghkull", "Grimgor", "Grotsnik", "Gorgutz", "Zodgrod", "Spleenrippa", "Ironfist", "Bugslaya", "Headsnagga"],
        }

        if (charName.includes("Champion")) {name = "Champion "};
        if (charName.includes("Lord")) {name = "Lord "};
        if (unit.faction === "Dao Union") {name = "Commander "};
        if (unit.keywords.includes("Ethereal Elder")) {name = "Ethereal "};
        if (charName.includes("Captain")) {name = "Captain "};
        if (charName.includes("Boss")) {name = "Boss "};
        if (charName.includes("Warboss")) {name = "Warboss "};
        if (charName.includes("Weirdboy")) {name = "Weirdboy "};



        let names = state.Valkyrie.heroes[unit.player];
        if (names === "" || !names) {
            names = factionNames[unit.faction];
        }

        let num = randomInteger(names.length) - 1;
        name += names[num];
        names.splice(num,1);
        state.Valkyrie.heroes[unit.player] = names;

        return name;
    }




    const TokenInfo = (msg) => {
        let Tag = msg.content.split(";");
        let id = Tag[1];
        let unit = ShipArray[id];
        if (!unit) {return};
        let label = unit.hexLabel;
        let hex = HexMap[label];
        SetupCard(unit.name,"Info",unit.faction);
        outputCard.body.push("Hex Label: " + label);
        outputCard.body.push("Terrain: " + hex.terrain);
        outputCard.body.push("Elevation: " + hex.elevation + "m");
        outputCard.body.push("Terrain Height: " + hex.terrainHeight + "m");
        outputCard.body.push("Cover: " + hex.cover);
        outputCard.body.push("Blocks LOS: " + hex.blockLOS);
        outputCard.body.push("Movement: " + hex.type);
        outputCard.body.push("Unit Keywords: " + unit.keywords.toString());
        outputCard.body.push("Unit Auras: " + unit.Auras().toString());
        outputCard.body.push("Unit Tips: " + unit.TTip().toString());
        let terrainID = hex.terrainID;
        if (terrainID) {
            let terrain = ShipArray[terrainID];
            if (!terrain) {
                terrain = new Unit(terrainID);
            }
            let hp = terrain.token.get("bar1_value");
            outputCard.body.push(terrain.name + ": " + hp + " HP Left");
        }

        PrintCard();
    }

    const RollDice = (msg) => {
        PlaySound("Dice");
        let roll = randomInteger(6);
        let playerID = msg.playerid;
        let id,unit,player;
        if (msg.selected) {
            id = msg.selected[0]._id;
        }
        let faction = "Neutral";

        if (!id && !playerID) {
            return;
        }
        if (id) {
            unit = ShipArray[id];
            if (unit) {
                faction = unit.faction;
                player = unit.player;
            }
        }
        if ((!id || !unit) && playerID) {
            faction = state.Valkyrie.players[playerID];
            player = (state.Valkyrie.factions[0] === faction) ? 0:1;
        }

        if (!state.Valkyrie.players[playerID] || state.Valkyrie.players[playerID] === undefined) {
            if (faction !== "Neutral") {    
                state.Valkyrie.players[playerID] = faction;
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
        RemoveLines(["Deploy","LOS"]);
        RemoveDead();
        if (Tag[1] === "All") {
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
            let tempTerrain = ["Artillery Craters","Burning Woods","Ruined Building","Ruined Concrete","Burning Crops","Smoke"];
            tokens = findObjs({
                _pageid: Campaign().get("playerpageid"),
                _type: "graphic",
                _subtype: "token",
                layer: "map",
            });
            _.each(tokens,token => {
                if (token.get("name")) {
                    if (token.get("name").includes("Woods") || token.get("name").includes("Orchard") || token.get("name").includes("Desert Scrub") ) {
                        token.set({
                            bar1_value: 4,
                            bar1_max: 4,
                        })
                    }
                    if (token.get("name").includes("Crops")) {
                        token.set({
                            bar1_value: 3,
                            bar1_max: 3,
                        })
                    }
                    if (token.get("name").includes("Brick")) {
                        token.set({
                            bar1_value: 6,
                            bar1_max: 6,
                        })
                    }
                    if (token.get("name").includes("Concrete")) {
                        token.set({
                            bar1_value: 9,
                            bar1_max: 9,
                        })
                    }
                    if (tempTerrain.includes(token.get("name"))) {
                        token.remove();
                    }

                }
            })
        }

        BuildMap();

        let target = ShipArray[state.targetID];
        if (target) {
            target.token.remove();
        }


        //clear arrays
        ShipArray = {};

        state.Valkyrie = {
            playerIDs: [],
            players: {},
            factions: [],
            turn: 0,
            activeID: "",
            deployLines: [],
            losLines: [],
            heroes: ["",""],
            limitedMacros: {},
            targetID: "",
        }

        





        sendChat("","Cleared State/Arrays");
    }

    const ShowUnactivated = () => {
        let names = [[],[]];
        let keys = Object.keys(ShipArray);

        let remaining = false;

        SetupCard("Activations Remaining","","Neutral");
        for (let i=0;i<keys.length;i++) {
            let unit = ShipArray[keys[i]];
            let token = unit.token;
            if (!token) {
                delete ShipArray[keys[i]];
                continue;
            }
            if (token && token.get("aura1_color") === Factions[unit.faction].objColour) {
                names[unit.player].push(unit.name);
                remaining = true;
            }
        }
        if (remaining === true) {
            for (let p=0;p<2;p++) {
                if (names[p].length > 0) {
                    outputCard.body.push("[U][B]" + state.Valkyrie.factions[p] + "[/b][/u]");
                    for (i=0;i<names[p].length;i++) {
                        outputCard.body.push(names[p][i]);
                    }
                }
            }
        } else {
            outputCard.body.push("All Units Activated");
        }
        PrintCard();
    }




    const RemoveDepLines = () => {
        for (let i=0;i<state.Valkyrie.deployLines.length;i++) {
            let id = state.Valkyrie.deployLines[i];
            let path = findObjs({_type: "path", id: id})[0];
            if (path) {
                path.remove();
            }
        }
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
   

    const CastSpell = (msg) => {
        let id = msg.selected[0]._id;
        let caster = ShipArray[id];
        let spells = Factions[caster.faction].spells;
        let points = parseInt(caster.token.get("bar2_value"));
        let bonusAvail = BonusSpellPoints(caster);

        SetupCard(caster.name,"Cast Spell",caster.faction);
        if (caster.token.get("tint_color") === "#ff0000") {
            outputCard.body.push("[#ff0000]Caster is Shaken and Cannot Cast Spells[/#]");
        } else if (points === 0) {
            outputCard.body.push("[#ff0000]Caster has No Spell Points[/#]");
        } else {
            for (let i=0;i<spells.length;i++) {
                let spellName = spells[i];
                let spellInfo = Spells[spellName];
                let extra = points - spellInfo.cost;
                if (extra >= 0) {


                    let s = spellInfo.cost === 1 ? "":"s"
                    let tip = '['+ spellName + '](#" class="showtip tipsy" title="' + spellInfo.description + ')';


                    outputCard.body.push("[B][U]" + tip + "[/b][/u]");

                    let extraQ = ";?{Extra Points|0";
                    for (let i=1;i<=extra;i++) {
                        extraQ += "|" + i + "(Self)";
                    }
                    for (let i=extra+1;i<=(extra + bonusAvail);i++) {
                        extraQ += "|" + i;
                    }
                    extraQ += "}"
                    if (extra + bonusAvail === 0) {
                        extraQ = ";0";
                    }
                    let targets = "";
                    for (let i=0;i<spellInfo.targets;i++) {
                        let t = "Target " + (i+1);
                        targets += ";&#64;&#123;target&#124;" + t + "&#124;token_id&#125;";
                    }
                    let info = {
                        action: "!Cast2;" + caster.id + ";" + spellName + extraQ + targets,
                        phrase:  spellInfo.cost + " Point" + s,
                    }
                    outputCard.inline.push(info);
                    outputCard.body.push("[INLINE]")
                    outputCard.body.push("[hr]");
                }
            }
            outputCard.body.push("Caster has " + points + " Spell Points total");
            s = (bonusAvail === 1) ? "":"s";
            if (bonusAvail > 0) {
                outputCard.body.push("Friendly Nearby Casters can add " + bonusAvail + " Point" + s);
            }




        }
        PrintCard();
    }




    const BonusSpellPoints = (caster,type = "Friendly") => {
        //find other casters within 9 hexes, add in their points, record their id's in case used, will work for both add and subtract as can check factions
        let casterHex = HexMap[caster.hexLabel];
        let totalAvail = 0;

        _.each(ShipArray,unit => {
            if (unit.casterLevel > 0 && unit.id !== caster.id && ((type === "Friendly" && unit.faction === caster.faction) || (type !== "Friendly" && unit.faction !== caster.faction))) {
                let unitHex = HexMap[unit.hexLabel];
                if (unitHex.offboard !== true) {
                    let losResult = LOS(caster,unit);
                    if (losResult.distance <= 9 && losResult.los === true) {
                        let p = parseInt(unit.token.get("bar2_value"));
                        if (p > 0) {
                            totalAvail += p;
                            spellCasterAssistIDs.push(unit.id);
                        }
                    }
                }
            }
        })
        return totalAvail;
    }

    //cast2 - checks valid targets, range etc, then puts out call for opposing points
    const Cast2 = (msg) => {
        let Tag = msg.content.split(";");
        let casterID = Tag[1];
        let caster = ShipArray[casterID];
        let spellName = Tag[2];
        let spellInfo = Spells[spellName];
        let extraPoints = parseInt(Tag[3]);
        let tIDs = [];
        let errorMsg = [];
        for (let i=4;i<Tag.length;i++) {
            let id = Tag[i];
            let targetUnit = ShipArray[id];
            if (!targetUnit) {
                sendChat("","Error in Targetting of Spell")
                continue;
            }
            let losResult = LOS(caster,targetUnit);
            if (losResult.los === false) {
                errorMsg.push("#ff0000" + targetUnit.name + " is not in LOS[/#]");
            } else if (losResult.distance > spellInfo.range) {
                errorMsg.push("#ff0000" + targetUnit.name + ' is Out of Range[/#]');
            } else if (spellInfo.friendly === true && targetUnit.faction !== caster.faction) {
                errorMsg.push("#ff0000" + unit.name + " is not Friendly[/#]");
            } else if (spellInfo.friendly === false && targetUnit.faction === caster.faction) {
                errorMsg.push("#ff0000" + unit.name + " is Friendly[/#]");
            } else {
                tIDs.push(id);
            }
        }

        if (errorMsg.length > 0) {
            SetupCard(caster.name,spellName,caster.faction);
            _.each(errorMsg,msg => {
                outputCard.body.push(msg);
            })
            spellCast = {};
            PrintCard();
        } else {
            spellCast = {
                casterID: casterID,
                spellName: spellName,
                targetIDs: [... new Set(tIDs)],
                extraPoints: extraPoints,
                oppPoints: 0,
            }
            //check if opposing spells
            let opposingMax = BonusSpellPoints(caster,"Hostile");
            let s = (opposingMax === 1) ? "":"s";
            if (opposingMax > 0) {
                let oppPlayer = caster.player === 0 ? 1:0;
                let oppFaction = state.Valkyrie.factions[oppPlayer];
                SetupCard(oppFaction,"Spell Opposition",oppFaction);
                outputCard.body.push("You can Oppose with " + opposingMax + " Point" + s);
                let maxExtraQ = ";?{Opposing Points|0";
                for (let i=1;i<=opposingMax;i++) {
                    maxExtraQ += "|" + i;
                }
                let action = "!Cast3" + maxExtraQ + "}";
                ButtonInfo("Oppose Spell Cast",action)
                PrintCard();
            } else {
                Cast4();
            }
        }
    }

    //cast3 - if opposing points, places them in spellCast
    const Cast3 = (msg) => {
        let Tag = msg.content.split(";");
        spellCast.oppPoints = parseInt(Tag[1]) || 0;
        Cast4();
    }

    //cast4 - rolls for success, pays cost
    const Cast4 = () => {
        SpendSpellPoints();
        let caster = ShipArray[spellCast.casterID];
        let spellInfo = Spells[spellCast.spellName];
        SetupCard(caster.name,spellCast.spellName,caster.faction);
        let delta = spellCast.extraPoints - spellCast.oppPoints;
        let target = Math.min(Math.max(2,4 - delta),6);
        let tip = "Base 4+";
        if (spellCast.extraPoints > 0) {
            tip += "<br>Extra Points from Caster/Allies: +" + spellCast.extraPoints;
        }
        if (spellCast.oppPoints > 0) {
            tip += "<br>Points from Opposing: -" + spellCast.oppPoints;
        }
        let targetDisplay = '[' + target + '](#" class="showtip" title="' + tip + ')';
        let spellRoll = randomInteger(6);
        outputCard.body.push("Roll: " + DisplayDice(spellRoll,caster.faction,24) + " vs. " + targetDisplay + "+");
        if (spellRoll < target) {
            outputCard.body.push("[#ff0000]The Spell Fails to be Cast[/#]");
        } else {
            outputCard.body.push("[#0000ff]The Spell is Successfully Cast[/#]");
            outputCard.body.push("[hr]");
            Cast5();
        }
        
        PrintCard();
    }

    const Cast5 = () => {
        //enact the spell
        //3 types - Buff, Debuff or Damage
        let caster = ShipArray[spellCast.casterID];
        let spellInfo = Spells[spellCast.spellName];
        if (spellInfo.type.includes("Damage")) {
            for (let i=0;i<spellCast.targetIDs.length;i++) {
                let msg = {
                    content: " ;" + caster.id + ";" + spellCast.targetIDs[i] + ";Spell",
                }
                Attack(msg);
            }
        }
        if (spellInfo.type.includes("Debuff")) {
            for (let i=0;i<spellCast.targetIDs.length;i++) {
                let enemy = ShipArray[spellCast.targetIDs[i]];
                enemy.token.set(Debuffs[spellInfo.debuff],true);
                outputCard.body.push(enemy.name + " has " + spellInfo.debuff);
            }
        }
        if (spellInfo.type.includes("Buff")) {
            for (let i=0;i<spellCast.targetIDs.length;i++) {
                let friendly = ShipArray[spellCast.targetIDs[i]];
                friendly.token.set(Buffs[spellInfo.buff],true);
                outputCard.body.push(friendly.name + " has " + spellInfo.buff);
            }
        }
    }

    const SpendSpellPoints = () => {
        let caster = ShipArray[spellCast.casterID];
        let spellInfo = Spells[spellCast.spellName];
        let casterSP = parseInt(caster.token.get("bar2_value"));
        //spell cost
        casterSP -= spellInfo.cost;
        //extra points used, starting with caster
        for (let i=0;i<spellCast.extraPoints;i++) {
            if (casterSP > 0) {
                casterSP--;
            } else {
                for (k=0;k<spellCasterAssistIDs.length;k++) {
                    let unit3 = ShipArray[spellCasterAssistIDs[k]];
                    let sp = parseInt(unit3.token.get("bar2_value"));
                    if (unit3.faction === caster.faction && sp > 0) {
                        sp--;
                        unit3.token.set("bar2_value",sp);
                    }
                }
            }
        }
        caster.token.set("bar2_value",casterSP);
        //opp points
        for (let i=0;i<spellCast.oppPoints;i++) {
            for (k=0;k<spellCasterAssistIDs.length;k++) {
                let unit3 = ShipArray[spellCasterAssistIDs[k]];
                let sp = parseInt(unit3.token.get("bar2_value"));
                if (unit3.faction !== caster.faction && sp > 0) {
                    sp--;
                    unit3.token.set("bar2_value",sp);
                }
            }
        }
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
            sendChat("","Its selecting shooter as target, may need to Move Shooter to Back");
            return;
        }


        let shooterHex = HexMap[shooter.hexLabel]
        let targetHex = HexMap[target.hexLabel];


        SetupCard(shooter.name,"LOS",shooter.faction);

        let losResult = LOS(shooter,target);
        if (losResult.notes && losResult.notes.length > 0) {
            outputCard.body.push("Ranged Shrouding adds 3 Hexes to Distance");
        }
        let d = losResult.distance;
        let m = d * 50;
        outputCard.body.push("Distance: " + d + " Hexes (" + m + "m)");
        if (losResult.los === false) {
            outputCard.body.push("No LOS to Target");
            outputCard.body.push(losResult.losReason);
        } else {
            outputCard.body.push("There is LOS to Target");
            if (losResult.hexCover === true) {
                outputCard.body.push("Target Is in Cover");
            }
            if (losResult.interCover === true) {
                outputCard.body.push("Target Has Intervening Cover");
            }
            if (losResult.building === true) {
                outputCard.body.push("Target in Building");
            }
        }
        outputCard.body.push("[hr]");
        let weaponWith = false,weaponWithout = false;

        _.each(shooter.weapons,weapon => {
            if (weapon.type !== "CCW") {
                let range = (target.type === "Aircraft" && weapon.keywords.includes("Unstoppable") === false) ? weapon.range - 6:weapon.range;   
                if (shooter.keywords.includes("Increased Shooting Range") || shooter.Auras().includes("Increased Shooting Range")) {
                    range += 3;
                }
                if (losResult.los === false && weapon.keywords.includes("Indirect") === false) {
                    outputCard.body.push("[#FF0000]" + weapon.name + " - no LOS[/#]");
                    weaponWithout = true;
                } else {
                    if (losResult.distance > range) {
                        outputCard.body.push("[#FF0000]" + weapon.name + " - not in Range[/#]");
                        weaponWithout = true;
                    } else if (losResult.los === false && weapon.keywords.includes("Indirect")) {
                        outputCard.body.push("[#0000ff]" + weapon.name + " - Indirect and In Range[/#]");
                        weaponWith = true;
                    } else {
                        outputCard.body.push("[#0000ff]" + weapon.name + " - In LOS and In Range[/#]");
                        weaponWith = true;
                    }
                }
            }
        })
        
        let pt1 = [shooterHex.centre.x,shooterHex.centre.y];
        let pt2 = [targetHex.centre.x,targetHex.centre.y];
        if (losResult.blockedHexLabel) {
            pt2 = [HexMap[losResult.blockedHexLabel].centre.x,HexMap[losResult.blockedHexLabel].centre.y];
        }
        let set = [pt1,pt2];
        let colour = "#000000";

        if (weaponWith === true && weaponWithout === false) {
            colour = "#00ff00";
        } else if (weaponWith === true && weaponWithout === true) {
            colour = "#ff0000";
        } 
        if (weaponWith === false && weaponWithout === false) {
            outputCard.body.push("Only CCW Weapons");
        }
        DrawLine(set,colour,"LOS");
        ButtonInfo("Remove Line","!RemoveLines2");
        PrintCard();
    }


    const AmbushAura = (msg) => {
        if (!msg.selected) {return};
        let id = msg.selected[0]._id;
        let ambusher = ShipArray[id];
        if (!ambusher) {return};
        let colour = (ambusher.token.get("aura2_color") !== "transparent" ) ? 'transparent':"#ffffff";
        ambusher.token.set({
            aura2_radius: 4,
            aura2_color: colour,
            showplayers_aura2: true,
        })
    }



    const LOS = (shooter,target) => {
        let notes = [];
        let shooterHex = HexMap[shooter.hexLabel];
        let targetHex = HexMap[target.hexLabel];
        if (shooter.type === "Titan") {
            let cubes = shooterHex.cube.linedraw(targetHex.cube);
            let cube = cubes[0];
            shooterHex = HexMap[cube.label()];
        }
        if (target.type === "Titan") {
            let cubes = targetHex.cube.linedraw(shooterHex.cube);
            let cube = cubes[0];
            targetHex = HexMap[cube.label()];
        }



        let distance = targetHex.cube.distance(shooterHex.cube);
        let shooterHeight = shooterHex.elevation;
        let targetHeight = targetHex.elevation;
        if (shooter.keywords.includes("Tall")) {shooterHeight += 2};
        if (target.keywords.includes("Tall")) {targetHeight += 2};
        if ((shooter.type === "Infantry" || shooter.type === "Hero" || shooter.type === "Light Vehicle/Small Monster") && shooterHex.building === true) {
            shooterHeight += shooterHex.terrainHeight - buildingLevelHeight;
        }
        if ((target.type === "Infantry" || target.type === "Hero" || target.type === "Light Vehicle/Small Monster") && targetHex.building === true) {
            targetHeight += targetHex.terrainHeight - buildingLevelHeight;        
        }
        let pt1 = new Point(0,shooterHeight);
        let pt2 = new Point(distance,targetHeight);
        let pt3,pt4,line1;

        if (shooter.type === "Aircraft" || target.type === "Aircraft") {
            let result = {los: true,distance: distance,hexCover: false,interCover: false,building: false};
            return result;
        }

        if ((target.Auras().includes("Ranged Shrouding") || target.keywords.includes("Ranged Shrouding")) && distance > 3) {
            distance += 3;
            notes.push("Ranged Shrouding");
        }

        let finalLOS = true;
        let interCoverFinal = false;
        let finalBlockedHexLabel;
        let hexCover = false;
        let finalLOSReason = "";
 
        let interCubes = [shooterHex.cube.linedraw(targetHex.cube),shooterHex.cube.linedraw2(targetHex.cube)];
        let labels = [interCubes[0].map((e)=> e.label()), interCubes[1].map((e)=> e.label())];

        let len = labels[0].length;
        let los = [true,true];
        let interCover = [false,false];
        let losReason = ["",""];
        let blockedHexLabel;
        for (let side=0;side<2;side++) {
            for (let i=0;i<len;i++) {
                let interHex = HexMap[labels[side][i]];
                //Hills
                if (interHex.hill === true) {
                    if (interHex.elevation > shooterHeight && interHex.elevation > targetHeight) {
                        los[side] = false;
                        losReason[side] = "Hill";
                        if (interHex.terrain.includes("Ridgeline")) {
                            losReason[side] = "Ridgeline/Hill";
                        }
                        blockedHexLabel = interHex.label;
                        break;
                    }
                }
                //Intervening Units
                if (interHex.tokenIDs.length > 0 && interHex.label !== targetHex.label) {
                    let u2 = ShipArray[interHex.tokenIDs[0]];
                    if (u2.type && u2.type !== "Objective" && u2.type !== "Aircraft") {
                        let h = 1;
                        if (u2.keywords.includes("Tall")) {h = 3};
                        pt3 = new Point(i+1,0);
                        pt4 = new Point(i+1,(interHex.elevation + interHex.terrainHeight + h));
                        line1 = lineLine(pt1,pt2,pt3,pt4); //intersection
                        if (line1) {
                            los[side] = false;
                            losReason[side] = u2.name;
                            blockedHexLabel = interHex.label;
                            break;
                        }
                    }
                }
                //Blocking Terrain or Cover Terrain
                pt3 = new Point(i+1,0);
                pt4 = new Point(i+1,(interHex.elevation + interHex.terrainHeight));
                line1 = lineLine(pt1,pt2,pt3,pt4); //intersection
                if (line1) {
                    if (interHex.blockLOS === true && i<(len-1)) {
                        los[side] = false;
                        losReason[side] = interHex.terrain;
                        blockedHexLabel = interHex.label;
                        break;
                    }
                    if (interHex.cover === true && target.keywords.includes("Tall") === false) {
                        interCover[side] = true;
                    } 
                    if (interHex.cover === "Infantry" && (target.type === "Infantry" || target.type === "Hero")) {
                        interCover[side] = true;
                    } 
                }
                //does edge at end give cover, and does so unless tall unit
                if (len > 1 && i === (len-1) && target.keywords.includes("Tall") === false) {
                    let dir = HexMap[labels[side][i-1]].cube.whatDirection(interHex.cube)
                    let edge = HexMap[labels[side][i-1]].edges[dir];
                    if (edge !== "Open") {
                        interCover[side] = true;
                    }
                }
            }
        }

        if (los[0] === false && los[1] === false) {
            finalLOS = false;
            finalLOSReason = losReason[0];
            finalBlockedHexLabel = blockedHexLabel;
            if (losReason[0] !== losReason[1]) {
                finalLOSReason += " / " + losReason[1];
            }
            finalLOSReason = "Blocked by " + finalLOSReason;
        }
        if (los[0] === true && los[1] === true) {
            if (interCover[0] === true && interCover[1] === true) {
                interCoverFinal = true;
            }
        }
        if (los[0] === true && los[1] === false) {
            interCoverFinal = interCover[0];
        }
        if (los[0] === false && los[1] === true) {
            interCoverFinal = interCover[1];
        }

        if (targetHex.cover === true) {
            hexCover = true;
        }
        if (targetHex.cover === false && targetHex.ridgeline === true) {
            let phi = Angle(shooterHex.cube.angle(targetHex.cube));
            for (let i=0;i<targetHex.ridgelineAngles.length;i++) {
                let theta = targetHex.ridgelineAngles[i];
                let theta2 = Angle(theta + 180);
                let delta = Math.abs(theta-phi);
                let delta2 = Math.abs(theta2 - phi);
                if (delta > 30 && delta2 > 30) {
                    hexCover = true;
                    break;
                }
            }
        }



        if (targetHex.cover === "Infantry" && target.type === "Infantry") {
            hexCover = true;
        }



        let result = {
            los: finalLOS,
            losReason: finalLOSReason,
            distance: distance,
            hexCover: hexCover,
            interCover: interCoverFinal,
            building: targetHex.building,
            blockedHexLabel: finalBlockedHexLabel,
            notes: notes,
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

    const ToBack = (msg) => {
        if (!msg.selected) {return};
        let id = msg.selected[0]._id;
        let unit = ShipArray[id];  
        if (!unit) {return}
        toBack(unit.token);
    }

    const SizeHex = (msg) => {
        if (!msg.selected) {return};
        _.each(msg.selected,selected => {
            let id = selected._id;
            let token = findObjs({_type:"graphic", id: id})[0];
            if (token) {
                token.set({
                    width: 165,
                    height: 140,
                })
            }
        })
    }

    const RotateHex = (msg) => {
        if (!msg.selected) {return};
        let token = findObjs({_type:"graphic", id: msg.selected[0]._id})[0];
        if (token) {
            token.set({
                rotation: token.get("rotation") + 60,
            })
        }
    }





    const changeGraphic = (tok,prev) => {
        let unit = ShipArray[tok.id];
        if (!unit && tok.name && tok.name.includes("Objective")) {
            unit = new Unit(token.get("id"));
        }
        let newLabel = new Point(tok.get("left"),tok.get("top")).toCube().label();
        let prevLabel = new Point(prev.left,prev.top).toCube().label();

        RemoveLines(["LOS"]);


        if (newLabel !== prevLabel && unit) {
            let newHex = HexMap[newLabel];
            let prevHex = HexMap[prevLabel];

            let valid = true;
            if (newHex.type === "Impassable") {
                valid = false;
            }
            if (newHex.building === true && LargeUnits.includes(unit.type)) {
                valid = false;
            }
            if (valid === false) {
                sendChat("","Cannot move here");
                newLabel = prevLabel;
                tok.set({
                    left: prev.left,
                    top: prev.top,
                })
                return;
            }
            log(unit.name + " is Moving");
            unit.hexLabel = newLabel;
            if (unit.type === "Objective") {return};
            let index = prevHex.tokenIDs.indexOf(tok.id);
            if (index > -1) {
                prevHex.tokenIDs.splice(index,1);
            }
            if (newHex.tokenIDs.includes(tok.id) === false) {
                newHex.tokenIDs.push(tok.id);
            }
            if (unit.token.get(Debuffs.dangerous) === true) {
                SetupCard(unit.name,"Dangerous Debuff",unit.faction);
                outputCard.body.push("The Unit must take a Dangerous Terrain Test");
                PrintCard();
            }
            if ((newHex.type === "Dangerous" || prevHex.type === "Dangerous") && unit.type !== "System") {
                SetupCard(unit.name,"Dangerous Terrain",unit.faction);
                outputCard.body.push("The Unit must take a (single) Dangerous Terrain Test");
                PrintCard();
            }
            let angle = Angle(prevHex.cube.angle(newHex.cube));
            tok.set("rotation",angle);
            unit.moved = true;
            if (newHex.tokenIDs.length > 1) {
                if (unit.type === "Hero") {
                    toFront(unit.token);
                } else {
                    toBack(unit.token);
                }
            }

            if (unit.name.includes("Zombies")) {
                PlaySound("Zombies");
            } 
            PlaySound(unit.moveSound);
        }


    }
    
    const destroyGraphic = (obj) => {
        let id = obj.get("id");
        if (id) {
            let unit = ShipArray[id];
            if (unit) {
                log(unit.name + " removed from Unit Array")
                let index = HexMap[unit.hexLabel].tokenIDs.indexOf(id);
                if (index > -1) {
                    HexMap[unit.hexLabel].tokenIDs.splice(index,1);
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
                log(state.Valkyrie);
                log("Units");
                log(ShipArray)
                break;
            case '!ClearState':
                ClearState(msg);
                break;
            case '!AddAbilities':
                AddAbilities(msg);
                break;

            case '!Activate':
                Activate(msg);
                break;
            case '!RedoOrder':
                RedoOrder(msg);
                break;

            case '!Morale':
                Morale(msg);
                break;

            case '!Attack':
                Attack(msg);
                break;

            case '!SizeHex':
                SizeHex(msg);
                break;
            case '!RotateHex':
                RotateHex(msg);
                break;




            case '!NextTurn':
                NextTurn();
                break;
            case '!DangerousTest':
                DangerousTest(msg);
                break;
            case '!Special':
                Special(msg);
                break;
            case '!SetArmies':
                SetArmies();
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
            case '!ToBack':
                ToBack(msg);
                break;
            case '!CastSpell':
                CastSpell(msg);
                break;
            case '!Cast2':
                Cast2(msg);
                break;
            case '!Cast3':
                Cast3(msg);
                break;
            case '!AmbushAura':
                AmbushAura(msg);
                break;
            case '!PlaceTarget':
                PlaceTarget(msg);
                break;

            case '!RemoveLines2':
                RemoveLines2();
                break;
            case '!Roll':
                RollDice(msg);
                break;
            case '!SetTT':
                SetTT(msg);
                break;
            case '!ShowUnactivated':
                ShowUnactivated();
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
        log("===>Valkyrie Grim Dark Future<===");
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


