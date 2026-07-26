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


    const ShipTypes = ["Heavy Cruiser","Light Cruiser","Destroyer","Frigate","Scout"];

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
    let Phases = ["Setup","Command","Sensor","Movement","Combat","Repair"];

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
    const Attribute = (characterID,attributename) => {
        //Retrieve Values from character Sheet Attributes
        let attributeobj = findObjs({type:'attribute',characterid: characterID, name: attributename})[0]
        let attributevalue = "";
        if (attributeobj) {
            attributevalue = attributeobj.get('current');
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
            this.token = token;
            this.size = parseInt(aa.size);
            this.hullMax = parseInt(aa.hull_max);
            this.engineMax = parseInt(aa.engine_max);
            this.type = aa.type;
            this.hull = parseInt(token.get("bar1_value"));
            this.engine = parseInt(token.get("bar3_value"));
            this.speed = Math.ceil(this.engineMax * 4 / this.hullMax);



            let weaponArray = [];
            let letters = ["A","B","C","D","E"];
            let sysNum = 0;
            for (let w=1;w<6;w++) {
                let weaponStatus = aa["weapon" + w + "status"];
                let weaponName = aa["weapon" + w + "name"];
                if (weaponStatus === "Off" || !weaponName) {continue};
                let weaponLetter = letters[sysNum];
                sysNum++;
                let weaponCharge = aa["weapon" + w + "charge"];
                let weaponType = aa["weapon" + w + "type"];
                let weaponFacing = aa["weapon" + w + 'facing'];
                let weaponRange = aa["weapon" + w + "range"].split("/").map((e) => parseInt(e));
                let weaponDice = parseInt(aa["weapon" + w + "dice"].split("d")[0]);
                let weaponNotes = aa["weapon" + w + "notes"];
                let weapon = {
                    status: weaponStatus,
                    letter: weaponLetter,
                    charge: weaponCharge,
                    name: weaponName,
                    type: weaponType,
                    facing: weaponFacing,
                    range: weaponRange,
                    dice: weaponDice,
                    notes: weaponNotes,
                }
                weaponArray.push(weapon);
            }
            this.weaponArray = weaponArray;


            //various
            this.driftDirection = 0; //reset when moves
            this.targetID = ""; //used by drones
            this.targetSize = 0;//used by drones


            ShipArray[id] = this;
            let index = HexMap[label].tokenIDs.indexOf(id);
            if (index < 0) {
                HexMap[label].tokenIDs.push(id);
            }


        }


        /* Shields here as a function ? - update variables so sheet stays current also

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
            this.forShield = this.forShieldArray[shieldLevel] || 0;
            this.portShieldArray = aa.portShieldArray.split("/").map((e)=> parseInt(e));
            portShield = this.portShieldArray[shieldLevel] || 0;
            this.stbdShieldArray = values.stbdShieldArray.split("/").map((e)=> parseInt(e));
            let stbdShield = this.stbdShieldArray[shieldLevel] || 0;
            this.aftShieldArray = values.aftShieldArray.split("/").map((e)=> parseInt(e));
            let aftShield = this.aftShieldArray[shieldLevel] || 0;

        Engines ?
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


        */



        Distance(b) {
            return HexMap[this.hexLabel].distance(HexMap[b.hexLabel]);
        }

        MoveToken(targetHex) {
            let index = HexMap[this.hexLabel].tokenIDs.indexOf(this.id);
            if (index > -1) {
                HexMap[this.hexLabel].tokenIDs.splice(index,1);
            }
            this.hexLabel = targetHex.label;
            targetHex.tokenIDs.push(this.id);
            this.token.set({
                left: targetHex.centre.x,
                top: targetHex.centre.y,
            })
        }

        DroneHit(obj2) {

        }

        Destroyed() {



            
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
                let unit = new Ship(token.get("id"));
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

    const NextPhase = () => {
        let currentPhase = state.Valkyrie.phase;
        let currentTurn = state.Valkyrie.turn;
        currentPhase += 1;
        if (currentPhase > 5) {
            currentTurn += 1;
            currentPhase = 1;
        };
        state.Valkyrie.turn = currentTurn;
        state.Valkyrie.phase = currentPhase;
        switch(currentPhase) {
            case 1:
                CommandPhase();
                break;
            case 2:
                SensorPhase();
                break;
            case 3:
                MovementPhase();
                break;
            case 4:
                CombatPhase();
                break;
            case 5:
                RepairPhase();
                break;
        }
    }

    const CommandPhase = () => {
        SetupCard("Command Phase","Turn " + state.Valkyrie.turn,"Neutral");
        _.each(ShipArray,ship => {
            //recharge weapons as appropriate
            _.each(ship.WeaponArray, weapon => {
                if (weapon.status === "Red") {
                    weapon.charge = "Red";
                } else {
                    if (weapon.notes.includes("Recharge")) {
                        weapon.charge = (weapon.charge === "Orange") ? "Green":"Orange";
                    } else {
                        weapon.charge = "Green";
                    }
                }
            })
            //reset all power checkboxes
            let list = ["fwdshields1","fwdshields2","portshields1","portshields2","stbdshields1","stbdshields2","aftshields1","aftshields2","reserve1","reserve2","reserve3","reserve4","reserve5","reserve6"]
            _.each(list,box => {
                AttributeSet(ship.charID,box,"0");
            })
        })
        outputCard.body.push("Allocate Power to each Ship");
        outputCard.body.push("Go to Next Phase when all done");
        PrintCard();
    }

    const SensorPhase = () => {
        SetupCard("Sensor Phase","Turn " + state.Valkyrie.turn,"Neutral");
        //add up any ships with power to reserve1 which is sensors
        let total = [0,0];
        let shipList = [[],[]]
        _.each(ShipArray,ship => {
            let sensor = Attribute(ship.charID,"reserve1");
            if (sensor === "1") {
                shipList[ship.player].push(ship.name);
                total[ship.player] += 2;
            }
            for (let i=1;i<4;i++) {
                let sys = Attribute(ship.charID,"system" + i);
                if (sys === "Advanced Sensors") {
                    total[ship.player] += 1;
                }
            }
        })
        for (let player = 0;player<2;player++) {
            outputCard.body.push("[U]" + state.Valkyrie.factions[player] + "[/u]");
            let roll1 = randomInteger(6);
            let roll2 = randomInteger(6);
            let tip = "Rolls: " + roll1 + " + " + roll2;
            tip += "<br>Bonus from Ships: " + total[player];
            tip += "<br>" + shipList[player].toString();
            let playerTotal = total[player] + roll1 + roll2;
            tip = '[' + playerTotal  + '](#" class="showtip" title="' + tip + ')';
            outputCard.body.push("Sensor Total: " + tip);
            total[player] = playerTotal;
        }

        outputCard.body.push("[hr]");
        if (total[0] > total[1]) {
            winner = 0;
        } else if (total[1] > total[0]) {
            winner = 1;
        } else if (total[0] === total[1]) {
            if (state.Valkyrie.lastWinner !== "") {
                winner = (state.Valkyrie.lastWinner === 0) ? 1:0;
            } else {
                winner = (randomInteger(6) > 3) ? 1:0;
            }
        }
        outputCard.body.push(state.Valkyrie.factions[winner] + " has Initiative");
        state.Valkyrie.lastWinner = winner;
        PrintCard();
    }

    const MovementPhase = () => {
        //Drifting Ships and Asteroids Move 1 hex in last direction
        _.each(ShipArray,object => {
            if ((object.type === "Ship" && object.token.get("bar3_value") === 0) || object.type === "Asteroid") {
                let direction = object.driftDirection;
                let startCube = HexArray[object.cube];
                let endCube = startCube.neighbour(direction);
                let nexHexLabel = endCube.label();
                if (HexMap[newHexLabel].tokenIDs !== "") {
                    //Collision



                }
                if (HexMap[newHexLabel].terrain !== "Empty Space") {
                    //Collision of some sort


                }
            }
        })


        SetupCard("Movement Phase","Turn " + state.Valkyrie.turn,"Neutral");
        let A = state.Valkyrie.factions[state.Valkyrie.lastWinner]
        let B = (state.Valkyrie.lastWinner === 0) ? state.Valkyrie.factions[1]:state.Valkyrie.factions[0];

        outputCard.body.push(A + " moves Half their Fleet");

        outputCard.body.push("Then " + B);
        outputCard.body.push("Then " + A + " moves the remainder");
        PrintCard();
    }


    const DroneMovement = () => {
        //Move Drones (launched in Combat now)
        _.each(ShipArray,object => {
            if (object.type === "Drone") {
                let target = ShipArray[object.targetID];
                let startHex = HexMap[object.hexLabel];
                let targetHex;
                let distance = Infinity;
                if (target) {
                    targetHex = HexMap[target.hexLabel];
                    distance = startHex.distance(targetHex);
                }
                if (!target || distance > 12) {
                    //acquire new target or if none in 12 hexes, go dormant in which case no targetHex
                    let sameSizeTargets = [];
                    let otherSizeTargets = []
                    _.each(ShipArray,ship => {
                        if (ship.faction !== object.faction) {
                            let dist = obj.Distance(ship);
                            if (dist <= 12) {
                                let info = {
                                        id: ship.id,
                                        dist: dist,
                                    }
                                if (ship.size === object.targetSize) {
                                    sameSizeTargets.push(info);
                                } else {
                                    otherSizeTargets.push(info);
                                }
                            }
                        }
                    })
                    if (otherSizeTargets.length > 0) {
                        otherSizeTargets.sort((a,b) => a.dist - b.dist); //sorted in ascending order of distance
                        target = ShipArray[otherSizeTargets[0]];
                    } 
                    if (sameSizeTargets.length > 0) {
                        sameSizeTargets.sort((a,b) => (a.dist - b.dist));
                        target = ShipArray[sameSizeTargets[0]];
                    }
                    if (target) {
                        targetHex = HexMap[target.hexLabel];
                        distance = startHex.distance(targetHex);
                    }
                }

                //no target Hex if no target, so it sits there this turn
                if (targetHex) {
                    let lineA = startHex.cube.linedraw(targetHex);
                    let lineB = startHex.cube.linedraw2(targetHex);
                    for (let i=0;i<distance;i++) {
                        let hex1 = HexMap[lineA[i]];
                        let hex2 = HexMap[lineB[i]];
                        let note = "";
                        let nextHex = "";
                        let obj2;
                        if (hex1.terrain === "Empty Space" && hex1.tokenIDs.length === 0) {
                            object.MoveToken(hex1);
                            continue;
                        } else if (hex2.terrain === "Empty Space" && hex2.tokenIDs.length === 0) {
                            object.MoveToken(hex2);
                            continue;
                        } 
                        if (hex1.terrain === "Empty Space") {
//run through ids
                            obj2 = ShipArray[hex1.tokenIDs[0]];
                            if (obj2.type !== "Asteroid") {
                                object.MoveToken(hex1);
                                continue;
                            }
                        }
                        if (hex2.terrain === "Empty Space") {
                            obj2 = ShipArray[hex2.tokenIDs[0]];
                            if (obj2.type !== "Asteroid") {
                                object.MoveToken(hex2);
                                continue;
                            }
                        }
                        //if gets to here, then either asteroids in 1 AND 2, or no empty space
                        if (obj2) {
                            //Collision with asteroid, use hex1 and resolve hit on asteroid
                            object.MoveToken(hex1);    
                            object.DroneHit(obj2);
                        } else {
                            //Collision with non-empty space, use hex1 and drone is destroyed
                            object.MoveToken(hex1);
                            object.Destroyed();
                        }
                    }
                    //if hasnt hit something yet, check if hit target
                    if (distance <= 3) {
                        //all drones speed 3
                        object.DroneHit(target);
                    } 
                }
            }
        })
    }




 
    const CombatPhase = () => {
        DroneMovement();
        SetupCard("Combat Phase","Turn " + state.Valkyrie.turn,"Neutral");
        outputCard.body.push("Player's take turns Firing with one ship");
        outputCard.body.push("Starting with the " + state.Valkyrie.factions[state.Valkyrie.lastWinner] + " player");
        PrintCard();
    }







    const RepairPhase = () => {
        SetupCard("Repair Phase","Turn " + state.Valkyrie.turn,"Neutral");
        outputCard.body.push("Player's take turns performing Repairs on one ship");
        outputCard.body.push("Starting with the " + state.Valkyrie.factions[state.Valkyrie.lastWinner] + " player");
        PrintCard();
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






    const SetFleets = () => {
        AddTokens();
        _.each(ShipArray,ship => {
            if (ship.type === "Asteroid") {
                //randomize direction


            } 
            if (ShipTypes.includes(ship.type)) {
                ship.engine = ship.engineMax;
                ship.hull = ship.hullMax;
                let speed = Math.ceil(ship.engineMax * 4 / ship.hullMax);
                ship.speed = speed;
                let hullID = AttributeID(ship.charID,"hull");
                let engineID = AttributeID(ship.charID,"engine");
                let speedID = AttributeID(ship.charID,"speed");
                ship.token.set({
                    bar1_value: ship.hull,
                    bar1_max: ship.hullMax,
                    bar1_link: hullID,
                    showplayers_bar1: true,
                    aura1_color: "#00ff00",
                    aura1_radius: 0.1,
                    showplayers_aura1: true,
                    showplayers_name: true,
                    statusmarkers: "",
                    tint_color: "transparent",
                    bar2_value: ship.speed,
                    bar2_link: speedID,
                    bar3_value: ship.engine,
                    bar3_max: ship.engineMax,
                    bar3_link: engineID,
                })


                //AddAbilities(ship);
            }

        });







    }



    const TokenInfo = (msg) => {
        let Tag = msg.content.split(";");
        let id = Tag[1];
        let ship = ShipArray[id];
        if (!ship) {return};
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

        state.Valkyrie = {
            playerIDs: [],
            players: {},
            factions: [],
            turn: 1,
            activeID: "",
            losLines: [],
            phase: 0,
            lastWinner: "",

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






    const changeGraphic = (tok,prev) => {
        let ship = ShipArray[tok.id];
        let newLabel = new Point(tok.get("left"),tok.get("top")).toCube().label();
        let prevLabel = new Point(prev.left,prev.top).toCube().label();

        RemoveLines(["LOS"]);



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
                log(state.Valkyrie);
                log("Ship");
                log(ShipArray)
                break;
            case '!ClearState':
                ClearState(msg);
                break;
            case '!AddAbilities':
                AddAbilities(msg);
                break;
            case '!NextPhase':
                NextPhase();
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


        }
    };

   



    const registerEventHandlers = () => {
        on('chat:message', handleInput);
        //on("add:graphic", addGraphic);
        on('change:graphic',changeGraphic);
        on('destroy:graphic',destroyGraphic);
    };
    on('ready', () => {
        log("===>Valkyrie<===");
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


