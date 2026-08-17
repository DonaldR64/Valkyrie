const NIMITZ = (() => { 
    const version = '1.4.4';
    if (!state.NIMITZ) {state.NIMITZ = {}};

    const pageInfo = {name: "",page: "",gridType: "",scale: "",width: "",height: ""};
    let TerrainArray = [];
    let edgeArray = [];
    let MOA = {}; //Master Object Array - ships, planes etc

    const Axis = ["Germany","Japan","Italy"];
    const Allies = ["US","UK"];
    const colours = {
        red: "#ff0000",
        blue: "#00ffff",
        yellow: "#ffff00",
        green: "#00ff00",
        purple: "#800080",
        black: "#000000",
    }

    const sm = {
        "fast": "status_Fast::5868456", 
        "normal": "status_Advantage-or-Up::2006462",
        "slow": "status_Disadvantage-or-Down::2006464", 
        "flash": "status_Flare::5867553",
        "stopped": "status_Stopped::5957135",
        "us": "status_US::5967034",
        "japan": "status_Japan::5967033",
        "uk": "status_UK::5969278",
        "germany": "status_Germany::5969277",
        "italy": "status_Italy::5969278",
    }

    let torpedoArray = {};

    const readyValue = "https://s3.amazonaws.com/files.d20.io/images/335152677/DfyYLQdQadaBN80ZnzQJUQ/thumb.png?1680278681";
    const firedValue = "https://s3.amazonaws.com/files.d20.io/images/335152678/s6OsNT1WLWKrlRqx0qkYoA/thumb.png?1680278681";
    const destroyedValue = "https://s3.amazonaws.com/files.d20.io/images/335450532/KR1KXqxmzv1hHLuORpaJOA/thumb.png?1680405339";
    const shipTypes = ["Battleship","Carrier","Cruiser","Destroyer","Merchant"];

    let outputCard = {title: "",subtitle: "",nation: "",body: [],buttons: [],};

    const findCommonElements = (arr1,arr2) => {
        //iterates through array 1 and sees if array 2 has any of its elements
        //returns true if the arrays share an element
        return arr1.some(item => arr2.includes(item));
    }

    const Nations = {
        "Germany": {
            "image": "https://s3.amazonaws.com/files.d20.io/images/331953857/idAiO4XBVblUDc9nC_0k3w/thumb.jpg?1678500473",
            "dice": "German",
            "backgroundColour": "#000000",
            "titlefont": "Bokor",
            "fontColour": "#FFFFFF",
            "borderColour": "#000000",
            "borderStyle": "5px double",
        },
        "US": {
            "image": "https://s3.amazonaws.com/files.d20.io/images/327595663/Nwyhbv22KB4_xvwYEbL3PQ/thumb.png?1676165491",
            "dice": "US",
            "backgroundColour": "#4169e1",
            "titlefont": "Arial",
            "fontColour": "#FFFFFF",
            "borderColour": "#4169e1",
            "borderStyle": "5px double",
        },
        "Japan": {
            "image": "https://s3.amazonaws.com/files.d20.io/images/331486217/9slnGqlYsDLtQT6wqNKkkg/thumb.png?1678225300",
            "dice": "Japan",
            "backgroundColour": "#FFFFFF",
            "titlefont": "Montserrat",
            "fontColour": "#A33B42",
            "borderColour": "#A33B42",
            "borderStyle": "5px double",
        },
        "UK": {
            "image": "https://s3.amazonaws.com/files.d20.io/images/331954160/0vtNSSfxtCgU2X84Gw-wNw/thumb.png?1678500573",
            "backgroundColour": "#0A2065",
            "dice": "UK",
            "titlefont": "Merriweather",
            "fontColour": "#FFFFFF",
            "borderColour": "#FF0000",
            "borderStyle": "5px groove",
        },
        "Neutral": {
            "image": "",
            "dice": "Neutral",
            "backgroundColour": "#FFFFFF",
            "titlefont": "Arial",
            "fontColour": "#000000",
            "borderColour": "#00FF00",
            "borderStyle": "5px ridge",
        }
    }

    const PlaneNames = (character,token) => {
        let alltokens = findObjs({
            _pageid: Campaign().get("playerpageid"),
            _type: "graphic",
            _subtype: "token",
            layer: "objects",
        })    
        let counter = 1;
        for (let i=0;i<alltokens.length;i++) {
            let tok = alltokens[i];
            let tokName = tok.get("name");
            if (tokName.includes(character.get("name"))) {
                let substring = tokName.replace(token.get("name"),"");
                let number = parseInt(substring);
                if (number >= counter) {
                    counter = number + 1;
                }
            }
        }
        let newname = character.get("name") + " " + counter;
        token.set("name",newname);
    }

    const Plane = (token,character) => {
        let attributeArray = AttributeArray(character.id);
        let nation = attributeArray.nation;
        let player = (Axis.includes(nation)) ? 0:1;
        if (nation === "Neutral") {player = 2};    
        let keys = Object.keys(MOA);
        for (let i=0;i<keys.length;i++) {
            let tempObj = MOA[keys[i]];
            if (tempObj.name === token.get("name")) {
                token.set("name",character.get("name"))
                break;
            }
        }
        if (token.get("name") === character.get("name")) {
            PlaneNames(character,token);
        }
        let plane = {
            name: token.get("name"),
            id: token.id,
            characterid: character.id,
            token: token,
            player: player,
            nation: nation,
            type: "Plane",
            speed: parseInt(attributeArray.flankspeed),
            location: new Point(token.get("left"),token.get("top")),
            startLocation: new Point(token.get("left"),token.get("top")),
            role: attributeArray.planerole,
            dogfight: parseInt(attributeArray.dogfight),
            dd: parseInt(attributeArray.planedd),
            traits: attributeArray.planetraits,
            observing: false,
        }
        if (plane.role === "Bomber" && plane.token.get(sm.highaltitude) === false && plane.token.get(sm.lowaltitude) === false) {
            plane.token.set(sm.lowaltitude,true); //the default for level bombers
        }

        if (plane.role === "Observation" && plane.token.get(sm.highaltitude) === false && plane.token.get(sm.lowaltitude) === false) {
            plane.token.set(sm.highaltitude,true); //the default for observation planes
        }

        return plane;
    }

    const Ship = (token,character) => {
        let attributeArray = AttributeArray(character.id);
        let nation = attributeArray.nation;
        let player = (Axis.includes(nation)) ? 0:1;
        if (nation === "Neutral") {player = 2};
        let vertices = TokenVertices(token);
        let speedLevels = attributeArray.speedlevels
        if (speedLevels) {
            speedLevels = speedLevels.split("/");
        }
        let armouredDeck;
        if (attributeArray.armoureddeck === "1") {
            armouredDeck = true;
        } else {armouredDeck = false};

        let crippled = (attributeArray.crippledtext === "Crippled!") ? true:false;

        let ship = {
            name: token.get("name"),
            id: token.id,
            token: token,
            characterid: character.id,
            player: player,
            nation: nation,
            location: new Point(token.get("left"),token.get("top")),
            startLocation: new Point(token.get("left"),token.get("top")),
            turned: false,
            startHeading: token.get("rotation"),
            type: attributeArray.type,
            armour: parseInt(attributeArray.armour),
            crippled: crippled,
            weaponArray: [],
            vertices: vertices,
            speedLevels: speedLevels,
            armouredDeck: armouredDeck,
            primaryFired: false,
            secondaryFired: false,
            torpedoesFired: false,
            tubes: {            
                "Port Torpedoes": 0,
                "Starboard Torpedoes": 0,
                "Port/Starboard Torpedoes": 0,
            },
        }

        let weaponArray = {
            "Primary": [],
            "Secondary": [],
            "Port Torpedoes": [],
            "Starboard Torpedoes": [],
            "Port/Starboard Torpedoes": [],            
        };
        for (let i=0;i<15;i++) {           
            if (attributeArray["weapon"+i+"status"] === "Off" || !attributeArray["weapon"+i+"status"]) {continue};
            let arcpic = attributeArray["weapon"+i+"arc"];
            let arc;
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331641803/n5m2i03MiMvZcA-KL4XgAQ/thumb.png?1678322493") {arc = "Fore,Port,Starboard,Aft"};
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331641789/btRPXf0ap6cmx5lGOv-8_A/thumb.png?1678322488") {arc = "Fore"};
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331641801/cgHlQhtR2biRjvMnbve9hw/thumb.png?1678322493") {arc = "Port"};
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331641790/G6GqNhT0dPWPVjxHo9kPxQ/thumb.png?1678322488") {arc = "Starboard"};
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331641802/1ldN1itC4WL_5Vfg7J3xdQ/thumb.png?1678322493") {arc = "Aft"};
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331882761/JGnrvZZrTtKMKsLICOTqpg/thumb.png?1678475346") {arc = "Port,Starboard"};
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331641774/7qd9d5VfJ9mBBWwrBBGdZQ/thumb.png?1678322481") {arc = "Fore,Port"};
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331641771/NNZtZJUq3cciDQICfjM7AA/thumb.png?1678322481") {arc = "Fore,Starboard"};
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331641772/8CzcE0RLYTCG90fKLOQbFw/thumb.png?1678322481") {arc = "Fore,Port,Starboard"};
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331641769/zNmfq26Hruh3WPBS0PesaA/thumb.png?1678322481") {arc = "Port,Aft"};
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331641770/83Zzfi-EDoaklWs6-Tgb2g/thumb.png?1678322481") {arc = "Starboard,Aft"};
            if (arcpic === "https://s3.amazonaws.com/files.d20.io/images/331641773/OBREO93989i2Ux4UmSxnjQ/thumb.png?1678322481") {arc = "Starboard,Port,Aft"};
            let wtype = attributeArray["weapon"+i+"type"];
            let wname = attributeArray["weapon"+i+"name"];
log(i + ": " + wname +  " - " + wtype);

            if (!wname || !wtype) {continue};
            let shortPen = attributeArray["weapon"+i+"short"].split("/");
            let longPen = attributeArray["weapon"+i+"long"].split("/");
            let wtubes = parseInt(attributeArray["weapon"+i+"tubes"]);
            let weaponNum = i.toString();
            let weapon = {
                weaponNum: weaponNum,
                type: wtype,
                name: wname,
                arc: arc,
                tubes: wtubes,
                shortPen: shortPen,
                longPen: longPen,
            }
            if (wtype.includes("Primary")) {
                weaponArray["Primary"].push(weapon);
            } else if (wtype.includes("Secondary")) {
                weaponArray["Secondary"].push(weapon);
            } else if (wtype.includes("Torpedo")) {
                if (weapon.arc.includes("Port") && weapon.arc.includes("Starboard")) {
                    ship["tubes"]["Port/Starboard Torpedoes"] = wtubes;
                    weaponArray["Port/Starboard Torpedoes"].push(weapon);
                } else if (weapon.arc.includes("Port") && weapon.arc.includes("Starboard") === false) {
                    ship["tubes"]["Port Torpedoes"] = wtubes;
                    weaponArray["Port Torpedoes"].push(weapon);
                } else if (weapon.arc.includes("Starboard") && weapon.arc.includes("Port") === false) {
                    ship["tubes"]["Starboard Torpedoes"] = wtubes;
                    weaponArray["Starboard Torpedoes"].push(weapon);
                }
            } else {
                sendChat("","A Weapon on " + ship.name + "doesnt fit category");
            }
        }

        ship.weaponArray = weaponArray;
        return ship;
    }


    const addToken = (token) => {
        let character = getObj("character", token.get("represents"));   
        if (character === null || character === undefined) {return};
log("Add: " + character.get("name"))
        let type = Attribute(character.id,"type");
        if (type === "System Unit") {
            //?
        } else if (type === "Plane") {
            let plane = Plane(token,character);
            log(plane)
            MOA[token.id] = plane;
        } else {
            let ship = Ship(token,character);
            log(ship)
            MOA[token.id] = ship;
        }
    }

    const simpleObj = (o) => {
        p = JSON.parse(JSON.stringify(o));
        return p;
    }

    const getCleanImgSrc = (imgsrc) => {
        let parts = imgsrc.match(/(.*\/images\/.*)(thumb|med|original|max)([^?]*)(\?[^?]+)?$/);
        if(parts) {
            return parts[1]+'thumb'+parts[3]+(parts[4]?parts[4]:`?${Math.round(Math.random()*9999999)}`);
        }
        return;
    }

    const DeepCopy = (variable) => {
        variable = JSON.parse(JSON.stringify(variable))
        return variable;
    }

    const DegToRad = (angle) => {
        let rad = angle * (Math.PI / 180);
        return rad;
    }

    const RadToDeg = (angle) => {
        let deg = angle * (180 / Math.PI);
        return deg;
    }

    const Attribute = (characterID,attributename,max) => {
        if (!max) {max = false};
        let attributeobj = findObjs({type:'attribute',characterid: characterID, name: attributename})[0];
        let attributevalue = "";
        if (attributeobj) {
            if (max === true) {
                attributevalue = attributeobj.get('max');
            } else {
                attributevalue = attributeobj.get('current');
            }
        }
        return attributevalue;
    }

    const AttributeArray = (characterID) => {
        let aa = {}
        let attributes = findObjs({_type:'attribute',_characterid: characterID});
        for (let j=0;j<attributes.length;j++) {
            let name = attributes[j].get("name")
            let current = attributes[j].get("current")   
            if (!current || current === "") {current = " "} 
            aa[name] = current;

        }
        return aa;
    }

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
    }

    const ButtonInfo = (phrase,action) => {
        let info = {
            phrase: phrase,
            action: action,
        }
        outputCard.buttons.push(info);
    }

    const SetupCard = (title,subtitle,nation) => {
        outputCard.title = title;
        outputCard.subtitle = subtitle;
        outputCard.nation = nation;
        outputCard.body = [];
        outputCard.buttons = [];
        outputCard.inline = [];
    }

    const DisplayDice = (roll,nation,size,d10) => {
        roll = roll.toString();
        let table;
        if (d10 === true) {
            table = findObjs({type:'rollabletable', name: "TenSided"})[0];
        } else {
            let tablename = Nations[nation].dice;
            table = findObjs({type:'rollabletable', name: tablename})[0];
        }
        let obj = findObjs({type:'tableitem', _rollabletableid: table.id, name: roll })[0];
        let avatar = obj.get('avatar');
        let out = "<img width = "+ size + " height = " + size + " src=" + avatar + "></img>";
        PlaySound("Dice");
        return out;
    }

    const PlaySound = (name) => {
        let sound = findObjs({type: "jukeboxtrack", title: name})[0];
        if (sound) {
            sound.set({playing: true,softstop:false});
        }
    }

    const LoadPage = () => {
        //build Page Info and flesh out Hex Info
        pageInfo.page = getObj('page', Campaign().get("playerpageid"));
        pageInfo.name = pageInfo.page.get("name");
        pageInfo.scale = pageInfo.page.get("scale_number"); //Scale in inches eg 1 inch, or 0.5inches
        pageInfo.width = pageInfo.page.get("width") * 70; //in pixels
        pageInfo.height = pageInfo.page.get("height") * 70;
    }

const CentreMap = () => {
    //check positions of all tokens
    //decide if need to just scroll map or expand based on their positions/proximity to edge
    let top = pageInfo.height;
    let right = pageInfo.width;
    let flags = [false,false,false,false];
    let centreMassX = 0;
    let centreMassY = 0;


    let keys = Object.keys(MOA);
    for (let i=0;i<keys.length;i++) {
        let obj = MOA[keys[i]];
        centreMassY += obj.location.y;
        centreMassX += obj.location.x;

        if (obj.location.y < 840) {
            flags[0] = true;
        };
        if ((top - obj.location.y) < 840) {
            flags[1] = true;
        };
        if (obj.location.x < 840) {
            flags[2] = true;
        };
        if ((right - obj.location.x) < 840) {
            flags[3] = true;
        };
    }

    let centreX = Math.floor(centreMassX/keys.length);
    let centreY = Math.floor(centreMassY/keys.length);

    let totalFlags = 0;
    for (let i=0;i<4;i++) {
        if (flags[i] === true) {totalFlags += 1}
    }

    if (totalFlags === 0) {return};

log("Total Flags: " + totalFlags)
    if (totalFlags > 1) {
        //expand map
        let newWidth = pageInfo.page.get("width") + 12;
        let newHeight = pageInfo.page.get("height") + 12;
        pageInfo.page.set("width",newWidth);
        pageInfo.page.set("height",newHeight);
        LoadPage();
        top = pageInfo.height;
        right = pageInfo.width;
    }

    //centre tokens
    let deltaX = (right/2) - centreX;
    let deltaY = (top/2) - centreY;

    for (let i=0;i<keys.length;i++) {
        let obj = MOA[keys[i]];
        let location = obj.location;
        let newX = location.x + deltaX;
        let newY = location.y + deltaY;
        let newPoint = new Point(newX,newY);
        obj.location = newPoint;
        obj.token.set({
            left: newX,
            top: newY,
        });
    }

}


    const ScrollMap = (newLocation) => {
        //scroll map if no one else placed offmap, else inc. size of map
        let deltaX = 0;
        let deltaY = 0;
        let expandX = false;
        let expandY = false;

        if (newLocation.x < 0) {deltaX = 12*70};
        if (newLocation.x > pageInfo.width) {deltaX = -12*70};
        if (newLocation.y < 0) {deltaY = 12*70};
        if (newLocation.y > pageInfo.height) {deltaY = -12*70};

        let keys = Object.keys(MOA);
        for (let i=0;i<keys.length;i++) {
            let obj = MOA[keys[i]];     
            let location = obj.location;
            let newX = location.x + deltaX;
            let newY = location.y + deltaY;

            if (newX >= pageInfo.width){
                expandX = true;
                break;
            } 
            if (newY >= pageInfo.height) {
                expandY = true;
                break;
            }
            if (newX <= 0) {
                expandX = true;
                deltaX = 0;
                break;
            }
            if (newY <= 0) {
                expandX = true;
                deltaY = 0
                break;
            }
        }

        if (expandX === true || expandY === true) {
            //expand map to accomodate
            let newWidth = pageInfo.page.get("width");
            let newHeight = pageInfo.page.get("height");
            if (expandX === true) {
                newWidth += 12;
            }
            if (expandY === true) {
                newHeight += 12;
            }
            pageInfo.page.set("width",newWidth);
            pageInfo.page.set("height",newHeight);
            LoadPage();
        }

        //shift everyone
        for (let i=0;i<keys.length;i++) {
            let obj = MOA[keys[i]];
            let location = obj.location;
            let newX = location.x + deltaX;
            let newY = location.y + deltaY;
            let newPoint = new Point(newX,newY);
            obj.location = newPoint;
            obj.token.set({
                left: newX,
                top: newY,
            })
        }

        newLocation.x += deltaX;
        newLocation.y += deltaY; 
        return newLocation;
    }


    const pointInPolygon = (point,polygon) => {
        //evaluate if point is in the polygon
        px = point.x
        py = point.y
        collision = false
        vertices = polygon.vertices
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

    const Distance = (point1,point2) => {
        let x = point1.x - point2.x;
        let y = point1.y - point2.y;
        let z = Math.sqrt(x*x + y*y);
        z = z/70 * pageInfo.scale;
        z = Math.round(z*10)/10
        return z;
    }

    const ShipDistance = (obj1,obj2) => {
        let pt1 = obj1.location;
        let closestDist = Infinity;
        if (obj2.type === "Plane" || obj2.type === "MTB") {
            closestDist = Distance(obj1.location,obj2.location);
        } else {
            for (let i=0;i<4;i++) {
                let pt2 = obj2.vertices[i];
                let pt3 = obj2.vertices[i+1];
                let dist = pointLine(pt1,pt2,pt3);
                if (dist < closestDist) {closestDist = dist}
            }
        }
        return closestDist;
    }

    const pointLine = (point1,pt2,pt3) => {
        //point1 is initial point, pt2/pt3 is the line segment points being checked
        //point2 is closest point on line pt2->pt3
        let A = point1.x - pt2.x;
        let B = point1.y - pt2.y;
        let C = pt3.x - pt2.x;
        let D = pt3.y - pt2.y;
        let dot = A * C + B * D;
        let len_sq = C * C + D * D;
        let param = -1;
        if (len_sq != 0) {
            param = dot / len_sq;
        } 
        let point2;
        if (param < 0) {
            point2 = pt2;
        }
        else if (param > 1) {
            point2 = pt3;
        }
        else {
            point2 = new Point((pt2.x + param * C),(pt2.y + param * D));
        }
        let dist = Distance(point1,point2)
        return dist
    }

    const TokenAngle = (origin,destination) => {
        let x = Math.round(origin.x - destination.x);
        let y = Math.round(origin.y - destination.y);
        let angle = Math.atan2(y,x)
        angle = RadToDeg(angle);
        angle = Math.round(angle)
        angle -= 90
        angle = Angle(angle);
        return angle
    }

    const Angle = (epsilon) => {
        while (epsilon < 0) {
            epsilon += 360;
        }
        while (epsilon > 360) {
            epsilon -= 360;
        }
        return epsilon
    }    

    const ARCS = (shooterObj,targetObj) => {
        let arc = {
            shooter: 0,
            target: 0,
        };
        //Shooter - what arc is Target in
        let phi = TokenAngle(shooterObj.location,targetObj.location);
        let rotation = Angle(Number(shooterObj.token.get("rotation")));
        let theta = Angle(phi - rotation);
        if ((theta >=0 && theta < 45) || (theta <= 360 && theta > 315)) {
            arc.shooter = "Fore";
        } else if (theta >= 45 && theta <= 135) {
            arc.shooter = "Starboard";
        } else if (theta > 135 && theta < 225) {
            arc.shooter = "Aft";
        } else if (theta >= 225 && theta <= 315) {
            arc.shooter = "Port";
        }
        //Target - what arc is incoming fire coming into
        phi = TokenAngle(targetObj.location,shooterObj.location);
        rotation = Angle(Number(targetObj.token.get("rotation")));
        theta = Angle(phi - rotation);
        if ((theta >=0 && theta < 45) || (theta <= 360 && theta > 315)) {
            arc.target = "Fore";
        } else if (theta >= 45 && theta <= 135) {
            arc.target = "Starboard";
        } else if (theta > 135 && theta < 225) {
            arc.target = "Aft";
        } else if (theta >= 225 && theta <= 315) {
            arc.target = "Port";
        }
        return arc
    }

    const polyPoly = (poly1,poly2) => {
        let vertices = poly2.vertices
        let len = (vertices.length - 1)
        for (let v=0;v<len;v++) {
            let pt1 = vertices[v]
            let pt2 = vertices[v+1]
            cross = polyLine(poly1,pt1,pt2)
            if (cross.length > 0) {
                return true
            }
        }
        return false
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
        return false;
    }

    //polygon / line collisions where typically pt1 is shooter and pt2 is target
    const polyLine = (polygon,pt1,pt2) => {
        let vertices = polygon.vertices;
        let len = (vertices.length - 1);
        let crossings = [];
        //go through each vertices, plus the next to create a line for checking intersection
        for (v=0;v<len;v++) {
            let pt3 = vertices[v];
            let pt4 = vertices[v+1];
            let point = lineLine(pt1,pt2,pt3,pt4);
            if (point) {
                crossings.push(point);
            }
        }
        return crossings;
    }

    class Point {
        constructor(x,y) {
            this.x = x;
            this.y = y;
        }
    };

    const TokenVertices = (tok) => {
        //convert a token to an object with vertices (corners) with final being the first
        let corners = []
        let tokX = tok.get("left")
        let tokY = tok.get("top")
        let w = tok.get("width")
        let h = tok.get("height")
        let rot = tok.get("rotation") * (Math.PI/180)
        //define the four corners of the target token as new points
        //also rotate those corners around the target tok center
        corners.push(RotatePoint(tokX, tokY, rot, new Point( tokX-w/2, tokY-h/2 )))     //Upper left
        corners.push(RotatePoint(tokX, tokY, rot, new Point( tokX+w/2, tokY-h/2 )))     //Upper right
        corners.push(RotatePoint(tokX, tokY, rot, new Point( tokX+w/2, tokY+h/2 )))     //Lower right
        corners.push(RotatePoint(tokX, tokY, rot, new Point( tokX-w/2, tokY+h/2 )))     //Lower left
        corners.push(RotatePoint(tokX, tokY, rot, new Point( tokX-w/2, tokY-h/2 )))     //Upper left
        return corners
    }

    const getAbsoluteControlPt = (controlArray, center, w, h, rot, scaleX, scaleY) => {
        let len = controlArray.length;
        let point = new Point(controlArray[len-2], controlArray[len-1]);
        //translate relative x,y to actual x,y 
        point.x = scaleX*point.x + center.x - (scaleX * w/2);
        point.y = scaleY*point.y + center.y - (scaleY * h/2);
        point = RotatePoint(center.x, center.y, rot, point);
        return point;
    }

    const RotatePoint = (cX,cY,angle, p) => {
        //cx, cy = coordinates of the center of rotation
        //angle = clockwise rotation angle
        //p = point object
        let s = Math.sin(angle);
        let c = Math.cos(angle);
        // translate point back to origin:
        p.x -= cX;
        p.y -= cY;
        // rotate point
        let newX = p.x * c - p.y * s;
        let newY = p.x * s + p.y * c;
        // translate point back:
        p.x = Math.round(newX + cX);
        p.y = Math.round(newY + cY);
        return p;
    }

    const Arrays = () => {
        let startTime = Date.now();        
        MOA = {};
        let tokens = findObjs({
            _pageid: Campaign().get("playerpageid"),
            _type: "graphic",
            _subtype: "token",
            layer: "objects",
        })    

        tokens.forEach((token) => {
            addToken(token);
        });
        let elapsed = Date.now()-startTime;
        log(tokens.length + " Tokens added");
        log("Arrays built in " + elapsed/1000 + " seconds");
    }


    const PrintCard = (id) => {
        let output = "";
        if (id) {
            let playerObj = findObjs({type: 'player',id: id})[0];
            let who = playerObj.get("displayname");
            output += `/w "${who}"`;
        } else {
            output += "/desc ";
        }
        if (!outputCard.nation) {
            outputCard.nation = "Neutral";
        }

        //start of card
        output += `<div style="display: table; border: ` + Nations[outputCard.nation].borderStyle + " " + Nations[outputCard.nation].borderColour + `; `;
        output += `background-color: #EEEEEE; width: 100%; text-align: center; `;
        output += `border-radius: 1px; border-collapse: separate; box-shadow: 5px 3px 3px 0px #aaa;;`;
        output += `"><div style="display: table-header-group; `;
        output += `background-color: ` + Nations[outputCard.nation].backgroundColour + `; `;
        output += `background-image: url(` + Nations[outputCard.nation].image + `), url(` + Nations[outputCard.nation].image + `); `;
        output += `background-position: left,right; background-repeat: no-repeat, no-repeat; background-size: contain, contain; align: center,centre; `;
        output += `border-bottom: 2px solid #444444; "><div style="display: table-row;"><div style="display: table-cell; padding: 2px 2px; text-align: center;"><span style="`;
        output += `font-family: ` + Nations[outputCard.nation].titlefont + `; `;
        output += `font-style: normal; `;

        let titlefontsize = "1.4em";
        if (outputCard.title.length > 12) {
            titlefontsize = "1em";
        }

        output += `font-size: ` + titlefontsize + `; `;
        output += `line-height: 1.2em; font-weight: strong; `;
        output += `color: ` + Nations[outputCard.nation].fontColour + `; `;
        output += `text-shadow: none; `;
        output += `">`+ outputCard.title + `</span><br /><span style="`;
        output += `font-family: Arial; font-variant: normal; font-size: 13px; font-style: normal; font-weight: bold; `;
        output += `color: ` +  Nations[outputCard.nation].fontColour + `; `;
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
                    out += `<a style ="background-color: ` + Nations[outputCard.nation].backgroundColour + `; padding: 5px;`
                    out += `color: ` + Nations[outputCard.nation].fontColour + `; text-align: center; vertical-align: middle; border-radius: 5px;`;
                    out += `border-color: ` + Nations[outputCard.nation].borderColour + `; font-family: Tahoma; font-size: x-small; `;
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
                let lineBack = (i % 2 === 0) ? "#D3D3D3" : "#EEEEEE";
                out += `<div style="display: table-row; background: ` + lineBack + `;; `;
                out += `"><div style="display: table-cell; padding: 0px 0px; font-family: Arial; font-style: normal; font-weight: normal; font-size: 14px; `;
                out += `"><span style="line-height: normal; color: #000000; `;
                out += `"> <div style='text-align: center; display:block;'>`;
                out += line + `</div></span></div></div>`;                
            }
            output += out;
        }

        //buttons
        if (outputCard.buttons.length > 0) {
            for (let i=0;i<outputCard.buttons.length;i++) {
                let out = "";
                let info = outputCard.buttons[i];
                out += `<div style="display: table-row; background: #FFFFFF;; `;
                out += `"><div style="display: table-cell; padding: 0px 0px; font-family: Arial; font-style: normal; font-weight: normal; font-size: 14px; `;
                out += `"><span style="line-height: normal; color: #000000; `;
                out += `"> <div style='text-align: center; display:block;'>`;
                out += `<a style ="background-color: ` + Nations[outputCard.nation].backgroundColour + `; padding: 5px;`
                out += `color: ` + Nations[outputCard.nation].fontColour + `; text-align: center; vertical-align: middle; border-radius: 5px;`;
                out += `border-color: ` + Nations[outputCard.nation].borderColour + `; font-family: Tahoma; font-size: x-small; `;
                out += `"href = "` + info.action + `">` + info.phrase + `</a></div></span></div></div>`;
                output += out;
            }
        }

        output += `</div></div><br />`;
        sendChat("",output);
        outputCard = {title: "",subtitle: "",nation: "",body: [],buttons: [],};
    }


    const StartNewGame = (msg) => {
        let Tag = msg.content.split(";");
        let period = Tag[1];
        let tod = Tag[2];
        let timeOfDay = (tod === "Yes") ? "Day":"Night";
        let darkness = (timeOfDay === "Day") ? false:true;
        state.NIMITZ = {
            testing: "Off",
            turn: 0,
            timeOfDay: timeOfDay,
            darkness: darkness,
            nations: ["",""],
            phase: "",
            LOSLine: [],
            period: period,
        }
        torpedoArray = {};

        pageInfo.page.set("width",72);
        pageInfo.page.set("height",48);
        LoadPage();

        RemoveMapTokens();
        ClearFire();

        let tokens = findObjs({
            _pageid: Campaign().get("playerpageid"),
            _type: "graphic",
            _subtype: "token",
            layer: "objects",
        })    

        tokens.forEach((token) => {
            let character = getObj("character", token.get("represents")); 
            if (!character) {return};
            let type = Attribute(character.id,"type");
            let flags = {
                "US": sm.us,
                "Japan": sm.japan,
                "Germany": sm.germany,
                "UK": sm.uk,
                "Italy": sm.italy,
            }
            if (shipTypes.includes(type)) {
                ResetWeapons(character);
                ResetDamage(character);
                let speedAtt = findObjs({type:'attribute',characterid: character.id, name: "speed"})[0];
                let speed = speedAtt.get("max"); 
                let structureAtt = findObjs({type:'attribute',characterid: character.id, name: "structure"})[0];
                let structure = structureAtt.get("max");
                let bouyancyAtt = findObjs({type:'attribute',characterid: character.id, name: "bouyancy"})[0];
                let bouyancy = bouyancyAtt.get("max");      
                let nationAtt = findObjs({type:'attribute',characterid: character.id, name: "nation"})[0];
                let nation = nationAtt.get("current");

                token.set({
                        bar1_value: structure,
                        bar1_max: structure,
                        bar1_link: structureAtt.id,
                        showplayers_bar1: true,
                        showplayers_bar2: true,
                        showplayers_bar3: true,
                        bar2_value: 0,
                        bar2_max: speed,
                        bar2_link: speedAtt.id,
                        bar3_value: bouyancy,
                        bar3_max: bouyancy,
                        bar3_link: bouyancyAtt.id,
                        statusmarkers: "",
                });

                token.set(flags[nation],true);

            } else if (type === "Plane") {
                token.set({
                        bar3_value: 0,
                        bar3_max: speed,
                        statusmarkers: "",
                });
                toFront(token);
            }
        });

        Arrays();
        SetupCard("New Game","","Neutral");
        outputCard.body.push("State Initialized");
        outputCard.body.push("Ships Reset")
        outputCard.body.push("Period: " + period);
        outputCard.body.push(timeOfDay + "time");
        PrintCard();
    }

    const Initiative = (msg) => {
        let Tag = msg.content.split(";");
        let id = Tag[1];
        let obj = MOA[id];
        if (!obj) {
            let tok = findObjs({_type:"graphic", id: id})[0];
            if (EscalationArray[id]) {
                id = EscalationArray[id];
                obj = MOA[id];
            } else {
                sendChat("","No Plane/Ship Associated with this Token");
                return
            }
        }
        let nation = obj.nation;
        let player = obj.player;
        let roll = randomInteger(6);
        SetupCard(nation,"Initiative",nation);
        let rollDisplay = DisplayDice(roll,nation,32);
        //modifiers
        outputCard.body.push(rollDisplay);
        PrintCard();   
    }

    const AdvancePhase = () => {
        let turn = state.NIMITZ.turn;
        let currentPhase = state.NIMITZ.phase;
        let phases = ["Initiative","Movement","Gunnery","Torpedo"];
        if (currentPhase === "") {
            currentPhase = "Initiative";
        } else {
            let num = phases.indexOf(currentPhase);
            num += 1;
            if (num > 3) {num = 0};
            currentPhase = phases[num];
        }
        if (currentPhase === "Initiative") {
            turn += 1;
        }
        state.NIMITZ.turn = turn;
        state.NIMITZ.phase = currentPhase;
        SetupCard(currentPhase,"Turn: " + turn,"Neutral");

        if (currentPhase === "Initiative") {
            SetupCard("Turn: " + turn,"","Neutral");
            ResetFlags();
            outputCard.body.push("Roll for Initiative");
            outputCard.body.push("Winner can choose to Move First/Shoot First");
            outputCard.body.push("Or can Move Second/Shoot Second");
        }
        if (currentPhase === "Movement") {
            outputCard.body.push("Slow -> Normal -> Fast");
        }
        if (currentPhase === "Gunnery") {
            CheckMovement();
            outputCard.body.push("Shoot First player Starts");
            outputCard.body.push("Firing By Formation");
            outputCard.body.push("Secondaries then Primaries");
        }
        if (currentPhase === "Torpedo") {
            ClearFire();
            outputCard.body.push("Shoot First player starts");
            outputCard.body.push("Once all Torpedoes launched, resolve attacks");
        }
        PrintCard();
    }

    const DrawLine = (shooterObj,targetObj,colour,number,layer) => {
        let offsets = [0.5,0.6,0.4,0.7,0.3,0.8,0.2,0.9,0.1];
        if (!layer) {layer = "objects"};
        let shooterRot = Angle(parseInt(shooterObj.token.get("rotation")));
        let targetRot = Angle(parseInt(targetObj.token.get("rotation")));
        let delta = Math.abs(shooterRot - targetRot);
        let offset1 = offsets[number];
        let offset2 = 1 - offset1;
        if (delta <= 120 || delta >= 240) {offset2 = offset1}

        let point1,point2;
        if (shooterObj.type === "Plane") {
            point1 = shooterObj.location;
        } else {
            point1 = DrawingPoint(shooterObj,offset1);
        }

        if (targetObj.type === "Plane") {
            point2 = targetObj.location;
        } else {
            point2 = DrawingPoint(targetObj,offset2);
        }

        let width = Math.abs(point1.x - point2.x);
        let height = Math.abs(point1.y - point2.y);
        let left = width/2;
        let top = height/2;

        let path = [["M",point1.x,point1.y],["L",point2.x,point2.y]];
        path = path.toString();


        let newLine = createObj("path", {   
            _pageid: Campaign().get("playerpageid"),
            _path: path,
            layer: layer,
            fill: colour,
            stroke: colour,
            stroke_width: 5,
            left: left,
            top: top,
            width: width,
            height: height,
        });

        let id = newLine.id;
        return id;
    }

const DrawQuadrants = () => {
    let x = Math.floor(pageInfo.width/(12*70));
    let y = Math.floor(pageInfo.height/(12*70));

    for (let i=1;i<x;i++) {
        let x1 = i*(12*70);
        let width = 0;
        let height = pageInfo.height-2;
        let left = width/2;
        let top = height/2;
        let path = [["M",x1,1],["L",x1,pageInfo.height-1]];
        path = path.toString();
        let newLine = createObj("path", {   
            _pageid: Campaign().get("playerpageid"),
            _path: path,
            layer: "map",
            fill: "#ffffff",
            stroke: "#ffffff",
            stroke_width: 5,
            left: left,
            top: top,
            width: width,
            height: height,
        });
    }
    for (let i=1;i<y;i++) {
        let y1 = i*(12*70);
        let width = pageInfo.width-2;
        let height = 0;
        let left = width/2;
        let top = height/2;
        let path = [["M",1,y1],["L",pageInfo.width-1,y1]];
        path = path.toString();
        let newLine = createObj("path", {   
            _pageid: Campaign().get("playerpageid"),
            _path: path,
            layer: "map",
            fill: "#ffffff",
            stroke: "#ffffff",
            stroke_width: 5,
            left: left,
            top: top,
            width: width,
            height: height,
        });
    }
}

const GunFX = (shooterObj,targetObj,arc,type,name) => {


    let point = GunPoint(shooterObj,arc,type,name);
    let phi = TokenAngle(shooterObj.location,targetObj.location);
    let img,w,h;
    if (type === "Large") {
        img = "https://s3.amazonaws.com/files.d20.io/images/335378605/5WOIYYnYQvjarA6HIu125A/thumb.png?1680380344";
        w = 30;
        h = 55;
    } else if (type === "Small" && name.includes("Turret")) {
        img = "https://s3.amazonaws.com/files.d20.io/images/335378594/mf5_rMz_AZRPTZKHkmSxxA/thumb.png?1680380341";
        w = 20;
        h = 30;
    } else if (name.includes("Port") || name.includes("Starboard")) {
        img = "https://s3.amazonaws.com/files.d20.io/images/335378594/mf5_rMz_AZRPTZKHkmSxxA/thumb.png?1680380341";
        w = 90;
        h = 40;
    }

    let newToken = createObj("graphic", {   
        left: point.x,
        top: point.y,
        width: w, 
        height: h,  
        rotation: phi,
        name: "Fire",
        isdrawing: true,
        pageid: Campaign().get("playerpageid"),
        imgsrc: img,
        layer: "objects",
        gmnotes: shooterObj.id,
    });
    toFront(newToken)






    //sound










}



    const GunPoint = (shooterObj,arc,type,name,ratio) => {
        //finds a point on edge of ship, based on type of weapon and which is firing
        let vertices = FiringVertices(shooterObj.token); 
        let pt1,pt2,x,y;
        //pt1 and pt2 are the 2 points line is drawn through, with ratio being how far down the line from 'top'
        if (name.includes("A Turret")) {
            ratio = 0.25;
        }
        if (name.includes("B Turret")) {
            ratio = 0.3;
        }
        if (name.includes("Q Turret")) {
            ratio = 0.4;
        }
        if (name.includes("R Turret")) {
            ratio = 0.5;
        }
        if (name.includes("S Turret")) {
            ratio = 0.6;
        }
        if (name.includes("X Turret")) {
            ratio = 0.7;
        }
        if (name.includes("Y Turret")) {
            ratio = 0.75;
        }
        if (name.includes("Port") || name.includes("Starboard")) {
            ratio = 0.5;
        }

        if (arc === "Starboard") {
            if (shooterObj.type === "Destroyer") {
                pt1 = vertices[3];
                pt2 = vertices[6];
            } else {
                pt1 = vertices[4];
                pt2 = vertices[5];
            }
        } else if (arc === "Port") {
            if (shooterObj.type === "Destroyer") {
                pt1 = vertices[1];
                pt2 = vertices[8];
            } else {
                pt1 = vertices[0];
                pt2 = vertices[9];
            }
        } else {
            pt1 = vertices[2];
            pt2 = vertices[7];
        } 
        if (pt1.x === pt2.x) {
            x = pt1.x;
            y = Math.round(((pt2.y - pt1.y)*ratio) + pt1.y);
        } else {
            let a = (pt2.y - pt1.y) / (pt2.x - pt1.x);
            x = Math.round(((pt2.x - pt1.x)*ratio) + pt1.x);
            y = Math.round((a * (x - pt1.x)) + pt1.y);            
        }

        let point = new Point(x,y);
        return point;
    }

    const FiringVertices = (tok) => {
        //convert a token to an object with vertices (corners) with final being the first
        //has extra points for firing purposes
        let points = []
        let tokX = tok.get("left")
        let tokY = tok.get("top")
        let w = tok.get("width")
        let h = tok.get("height")
        let rot = tok.get("rotation") * (Math.PI/180)
        //define the points
        //also rotate those points around the target tok center
        points.push(RotatePoint(tokX, tokY, rot, new Point( tokX-w/2, tokY-h/2 )))     //Upper left 0
        points.push(RotatePoint(tokX, tokY, rot, new Point( tokX-w/4, tokY-h/2 )))     //UL part 1
        points.push(RotatePoint(tokX, tokY, rot, new Point( tokX, tokY-h/2 )))     //U Mid 2
        points.push(RotatePoint(tokX, tokY, rot, new Point( tokX+w/4, tokY-h/2 )))     //UR part 3
        points.push(RotatePoint(tokX, tokY, rot, new Point( tokX+w/2, tokY-h/2 )))     //Upper right 4

        points.push(RotatePoint(tokX, tokY, rot, new Point( tokX+w/2, tokY+h/2 )))     //Lower right 5
        points.push(RotatePoint(tokX, tokY, rot, new Point( tokX+w/4, tokY+h/2 )))     //LR part 6
        points.push(RotatePoint(tokX, tokY, rot, new Point( tokX, tokY+h/2 )))     //L Mid 7
        points.push(RotatePoint(tokX, tokY, rot, new Point( tokX-w/4, tokY+h/2 )))     //LL part 8
        points.push(RotatePoint(tokX, tokY, rot, new Point( tokX-w/2, tokY+h/2 )))     //Lower left 9

        return points
    }


    const DrawingPoint = (object,ratio) => {
        //finds a point on midline of ship, based on ratio 0-1 where 0 is top/front
        let vertices = object.vertices;
        let pt1 = new Point(Math.round((vertices[0].x + vertices[1].x)/2),Math.round((vertices[0].y + vertices[1].y)/2)); 
        let pt2 = new Point(Math.round((vertices[2].x + vertices[3].x)/2),Math.round((vertices[2].y + vertices[3].y)/2)); 
        let point = FindPointOnLine(pt1,pt2,ratio);
        return point;
    }

    const FindPointOnLine = (pt1,pt2,ratio) => {
        let x,y;
        if (pt1.x === pt2.x) {
            x = pt1.x;
            y = Math.round(((pt2.y - pt1.y)*ratio) + pt1.y);
        } else {
            let a = (pt2.y - pt1.y) / (pt2.x - pt1.x);
            x = Math.round(((pt2.x - pt1.x)*ratio) + pt1.x);
            y = Math.round((a * (x - pt1.x)) + pt1.y);            
        }
        let point = new Point(x,y);
        return point;
    }

    const RemoveLines = () => {
        let lineIDArray = state.NIMITZ.LOSLines;
        if (!lineIDArray) {
            state.NIMITZ.LOSLine = [];
            return;
        }
        for (let i=0;i<lineIDArray.length;i++) {
            let id = lineIDArray[i];
            let path = findObjs({_type: "path", id: id})[0];
            if (path) {
                path.remove();
            }
        }
        state.NIMITZ.LOSLines = [];  
    }

    const ResolveEscalation = (ship) => {
        let ccl = parseInt(Attribute(ship.characterid,"crewcritlvl"));
        let ecl = parseInt(Attribute(ship.characterid,"enginecritlvl"));
        let wcl = parseInt(Attribute(ship.characterid,"weaponcritlvl"));
        if (ccl < 2 && ecl < 4 && wcl < 4) {
            PrintCard();
            return;//back to DC then back to Damage Control and next ship
        }
        outputCard.body.push("[hr]");
        if (ccl > 1) {
            outputCard.body.push("Crew System Escalation Test");
            let roll = randomInteger(6);
            outputCard.body.push(DisplayDice(roll,ship.nation,24,false));
            if (roll > 3) {
                ccl = Math.min(ccl+1,6);
                outputCard.body.push("Crew System Critical Level escalates to " + ccl);
                CrewCritical(ship,false,false);
            } else {
                outputCard.body.push("No Crew System Escalation this Turn");
            }
        }
        if (wcl > 3) {
            outputCard.body.push("Weapon System Escalation Test");
            let roll = randomInteger(6);
            outputCard.body.push(DisplayDice(roll,ship.nation,24,false));
            if (roll > 3) {
                wcl = Math.min(wcl+1,6);
                outputCard.body.push("Weapon System Critical Level escalates to " + wcl);
                WeaponCritical(ship,false,false);
            } else {
                outputCard.body.push("No Weapon System Escalation this Turn");
            }
        }
        if (ecl > 3) {
            outputCard.body.push("Engine System Escalation Test");
            let roll = randomInteger(6);
            outputCard.body.push(DisplayDice(roll,ship.nation,24,false));
            if (roll > 3) {
                ecl = Math.min(ecl+1,6);
                outputCard.body.push("Engine System Critical Level escalates to " + ecl);
                EngineCritical(ship,false,false);
            } else {
                outputCard.body.push("No Engine System Escalation this Turn");
            }
        }
        PrintCard();
    }


const ReloadWeapons = (obj) => {
    let cID = obj.characterid;
    let weaponArray = obj.weaponArray;
    let weaponTypes = ["Primary","Secondary"];
    for (let i=0;i<weaponTypes.length;i++) {
        let subArray = weaponArray[weaponTypes[i]];
        for (let j=0;j<subArray.length;j++) {
            let weapon = subArray[j];
            let weaponNum = weapon.weaponNum;
            if (!weaponNum || weaponNum === "") {continue};
            if (Attribute(cID,"weapon"+weaponNum+"fired") === destroyedValue) {continue};
            AttributeSet(cID,"weapon"+weaponNum+"fired",readyValue);
        }
    }
}


    const ResetFlags = () => {
        let keys = Object.keys(MOA);
        for (let i=0;i<keys.length;i++) {
            let id = keys[i];
            let obj = MOA[id];
            if (shipTypes.includes(obj.type)) {
                obj.startLocation = obj.location;
                obj.startHeading = Angle(parseInt(obj.token.get("rotation")));
                obj.token.set(sm.fast,false);
                obj.token.set(sm.slow,false);
                obj.token.set(sm.normal,false);
                obj.token.set(sm.flash,false);
                obj.token.set("bar2_value",0);
                obj.turned = false;
                obj.primaryFired = false;
                obj.secondaryFired = false;
                obj.torpedoesFired = false;
                ReloadWeapons(obj);
            }
            if (obj.type === "Plane") {
                obj.startLocation = obj.location;
                obj.token.set("bar2_value",0);
                obj.token.set(sm.dogfight,false);
                obj.observing = false;
            }
        }
    }

    const ResetWeapons = (character) => {
        let cID = character.id;        
        for (let i=0;i<15;i++) {
            let status = Attribute(cID,"weapon" + i + "status");
            if (!status) {
                status = "Off";
                AttributeSet(cID,"weapon" + i + "status","Off")
            }
            if (status === "Off") {continue};
            //reset tubes
            let wtubes = Attribute(cID,"weapon"+i+"tubes",true);
            if (!wtubes) {
                wtubes = Attribute(cID,"weapon"+i+"tubes");
                AttributeSet(cID,"weapon"+i+"tubes",wtubes,true);
            }
            AttributeSet(cID,"weapon"+i+"tubes",wtubes);
            //reset to ready
            AttributeSet(cID,"weapon"+i+"fired",readyValue);
            AttributeSet(cID,"weapon" + i + "status","On");
        }
    }

    const ResetDamage = (character) => {
        let cID = character.id;
        let damaged = ["structure","bouyancy","director","flak"];
        for (let i=0;i<damaged.length;i++) {
            let attName = damaged[i];
            let att = Attribute(cID,attName,true);
            if (!att) {
                att = Attribute(cID,attName);
                AttributeSet(cID,attName,att,true);
            }
            AttributeSet(cID,attName,att);
        }
        AttributeSet(cID,"flakposition",2);
        let speed = Attribute(cID,"speedmax");
        AttributeSet(cID,"speed",speed,true);
        //turn on abilities
        let abilArray = findObjs({  _type: "ability", _characterid: cID});
        for(let a=0;a<abilArray.length;a++) {
            abilArray[a].set("istokenaction",true);
        } 
        AttributeSet(cID,"crippledtext","");
    }

    const LOS = (point1,point2,landonly) => {
        if (!landonly) {landonly = false};
        for (let i=0;i<TerrainArray.length;i++) {
            let polygon = TerrainArray[i];
            let intersections = polyLine(polygon,point1,point2);
            if (intersections.length > 0) {
                return false;
            }
        }
        if (landonly === false) {
            for (let i=0;i<SmokeArray.length;i++) {
                let polygon = SmokeArray[i];
                let intersections = polyLine(polygon,point1,point2);
                if (intersections.length > 0) {
                    return false;
                }
            }            
        }
        return true;
    }

    const CheckMovement = () => {
        let keys = Object.keys(MOA);
        for (let i=0;i<keys.length;i++) {
            let ship = MOA[keys[i]];
            if (shipTypes.includes(ship.type) === false) {continue};
            let movement = ship.token.get("bar2_value");
            if (movement > 0 || ship.token.get(sm.stopped) === true) {continue};
            let location = ship.location;
            let heading = DegToRad(Angle(parseInt(ship.token.get("rotation"))) - 90);
            let newX = ship.location.x + (Math.cos(heading) * 70 / pageInfo.scale);     
            let newY = ship.location.y + (Math.sin(heading) * 70 / pageInfo.scale);
            let newLocation = new Point(newX,newY);
            MOA[keys[i]].location = newLocation;
            MOA[keys[i]].token.set({
                left: newLocation.x,
                top: newLocation.y,
                bar2_value: 1,
            });
            MOA[keys[i]].vertices = TokenVertices(ship.token);
            MOA[keys[i]].token.set(sm.slow,true);
        }
    }

   const ShipMove = (msg) => {
        if (state.NIMITZ.phase !== "Movement" && state.NIMITZ.testing === "Off") {
            return;
        }
        if (!msg.selected) {return}
        let id = msg.selected[0]._id;
        let ship = MOA[id];
        if (!ship) {
            sendChat("","Not in Array");
            return;
        }

        if (ship.turned === "Mid") {
            ship.turned = true;
        }

        if (!ship) {return};
        let fast = ship.token.get(sm.fast);
        let slow = ship.token.get(sm.slow);
        let normal = ship.token.get(sm.normal);

        if (shipTypes.includes(ship.type) === false) {return}
        let speed = parseInt(ship.token.get("bar2_max"));
        let movement = parseInt(ship.token.get("bar2_value"));
        if (movement >= speed) {
            sendChat("","Moved Full Speed")
            return;        
        }
        movement += 1;
        let location = ship.location;
        let heading = DegToRad(Angle(parseInt(ship.token.get("rotation"))) - 90);
        let newX = ship.location.x + (Math.cos(heading) * 70 / pageInfo.scale);     
        let newY = ship.location.y + (Math.sin(heading) * 70 / pageInfo.scale);
        let newLocation = new Point(newX,newY);
        if (newLocation.x < 0 || newLocation.x > pageInfo.width || newLocation.y < 0 || newLocation.y > pageInfo.height) {
            newLocation = ScrollMap(newLocation);
        }

        if (movement < 6) {
            slow = true;
            fast = false;
            normal = false;
        } else if (movement > 9) {
            slow = false;
            fast = true;
            normal = false;
        } else {
            slow = false;
            fast = false;
            normal = true;
        }
        MOA[id].token.set(sm.fast,fast);
        MOA[id].token.set(sm.slow,slow);
        MOA[id].token.set(sm.normal,normal);

        MOA[id].token.set({
            left: newLocation.x,
            top: newLocation.y,
            bar2_value: movement,
        });
        MOA[id].vertices = TokenVertices(ship.token);
        MOA[id].location = newLocation;
        MOA[id].startHeading = ship.token.get("rotation");
    }

    const ShipTurn = (msg) => {
        if (!msg.selected) {return};
        let Tag = msg.content.split(";");
        let direction = Tag[1];
        if (state.NIMITZ.phase !== "Movement" && state.NIMITZ.testing === "Off") {
            return;
        }

        let id = msg.selected[0]._id;
        let ship = MOA[id];
        if (!ship) {
            sendChat("","Not in Array");
            return
        }

        if (shipTypes.includes(ship.type) === false) {return}
        if (ship.turned === true) {
            sendChat("","Already Turned");
            return
        }

        let startHeading = ship.startHeading;
        let currentHeading = Angle(parseInt(ship.token.get("rotation")));
        if (direction === "Port") {
            currentHeading = Angle(currentHeading - 15);
            currentTurn = "Port";
        }
        if (direction === "Starboard") {
            currentHeading = Angle(currentHeading + 15);
            currentTurn = "Starboard";
        }
        let delta = Math.min((currentHeading - startHeading),(360 + startHeading - currentHeading));
        let max = 90;

        if (Math.abs(delta) > max) {
            sendChat("","Already at Max of " + max + "°");
            return;
        }
        MOA[id].token.set("rotation",currentHeading);
        MOA[id].vertices = TokenVertices(ship.token);
        MOA[id].turned = "Mid";
    }



const WeaponFX = (shooterObj,targetObj,strike,system,tubes) => {
    let vertices = targetObj.vertices;
    let minX = Infinity,maxX = 0,minY = Infinity,maxY = 0;
    for (let i=0;i<4;i++) {
        let vert = vertices[i];
        if (vert.x < minX) {minX = vert.x};
        if (vert.x > maxX) {maxX = vert.x};
        if (vert.y < minY) {minY = vert.y};
        if (vert.y > maxY) {maxY = vert.y};
    }
    let x,y;
    let n = Math.random();
    let point2 = DrawingPoint(targetObj,n);
    x = point2.x;
    y = point2.y;

    if (strike === false) {
        if (randomInteger(2) === 1) {
            x = minX - randomInteger(70 / pageInfo.scale);
        } else {
            x = maxX + randomInteger(70 / pageInfo.scale);
        }
        if (randomInteger(2) === 1) {
            y = minY - randomInteger(70 / pageInfo.scale);
        } else {
            y = maxY + randomInteger(70 / pageInfo.scale);
        }
    }

    if (system.includes("Gun") || system === "Bomb") {
        type = "glow-frost";
        if (strike === true) {
            type = "glow-fire"
        } else if (strike === "Critical") {
            type = "burn-fire";
        }
        spawnFx(x,y,type);
    } 

    let sound;
log(system)
    if (system.includes("Large")) {
        let t = Math.min(Math.max(2,tubes),4);
        sound = "Large" + t;
    } else if (system.includes("Secondary") || system.includes("Small")) {
        sound = "Small";
    }
log("Sound: " + sound)    
    PlaySound(sound);
}


const AddAbilities = (msg) => {
    let id = msg.selected[0]._id;
    let obj = MOA[id];
    if (!obj) {return};
    let character = getObj("character", obj.token.get("represents"));   
    ResetWeapons(character);
    ResetDamage(character);
    let abilArray = findObjs({  _type: "ability", _characterid: obj.characterid});
    //clear old abilities
    for(let a=0;a<abilArray.length;a++) {
        abilArray[a].remove();
    } 

    let type = obj.type;
    let abilityName;
    let abilityAction;
    let weaponNum = 1;

    if (shipTypes.includes(obj.type)) {
        let weaponArray = obj.weaponArray;
        if (weaponArray["Primary"].length > 0) {
            let sys = weaponArray["Primary"][0].type;
            abilityName = weaponNum + ": Primary Guns";
            abilityAction = "!Weapons;Gunnery;@{selected|token_id};@{target|token_id};" + sys;
            AddAbility(abilityName,abilityAction,obj.characterid);
            weaponNum += 1;
        }

        if (weaponArray["Secondary"].length > 0) {
            abilityName = weaponNum + ": Secondary Guns";
            abilityAction = "!Weapons;Gunnery;@{selected|token_id};@{target|token_id};Secondary";
            AddAbility(abilityName,abilityAction,obj.characterid);
            weaponNum += 1
        }

        let torps = ["Port/Starboard Torpedoes","Port Torpedoes","Starboard Torpedoes"];
        for (let t=0;t<torps.length;t++) {
            let array = weaponArray[torps[t]];
            if (array.length === 0) {continue};
            let racks = "?{Racks (" + obj["tubes"][torps[t]] + " Torps per)|";
            for (let r=0;r<array.length;r++) {
                if (r > 0) {racks += "|"}
                racks += (r+1);
            }
            racks += "}";
            abilityName = weaponNum + ": " + torps[t];
            abilityAction = "!Weapons;Torpedo;@{selected|token_id};@{target|token_id};" + racks + ";" + torps[t];
            weaponNum += 1;
            AddAbility(abilityName,abilityAction,obj.characterid);
        }

    }




 
}


const AddAbility = (abilityName,action,charID) => {
    let ability = createObj("ability", {
        name: abilityName,
        characterid: charID,
        action: action,
        istokenaction: true,
    })
    return ability.id;
}

const ToggleAbility = (ship,abilityName,toggle) => {
    let ability = findObjs({type:'ability',characterid: ship.characterid, name: abilityName})[0]; 
    if (ability) {
            ability.set("istokenaction",toggle);
    } else {
        log("error in toggle ability");
        log("Ship: " + ship.name);
        log("Ability Name: " + abilityName);
        sendChat("","Check Log")
    }

}

const ToggleAbilityByID = (ship,abilityID,toggle) => {

    let ability = findObjs({type:'ability',characterid: ship.characterid, id: abilityID})[0]; 
    if (ability) {
            ability.set("istokenaction",toggle);
    } else {
        log("error in toggle ability");
        log("Ship: " + ship.name);
        log("Ability ID: " + abilityID);
        sendChat("","Check Log")
    }
}

const ClearFire = () => {
    let alltokens = findObjs({
        _pageid: Campaign().get("playerpageid"),
        _type: "graphic",
        _subtype: "token",
        layer: "objects",
    })    
    alltokens.forEach((token) => {
        if (token.get("name") === "Fire") {
            token.remove();
        }
    });
}


const ShipDeath = (targetObj) => {
    sendChat("","Dead Ship Placeholder");
}

const TorpedoDifficulty = (shooterObj,targetObj,racks,rackType,calling,range,arcs,mod) => {
    let shooterArc = arcs.shooter;
    let targetArc = arcs.target;
    let result = {
        shooterNation: shooterObj.nation,
        shooterType: shooterObj.type,
        targetID: targetObj.id,
        target: 7,
        torpedoes: 0,
        errorMsg: "",
        tips: "",
        ids: [], //ids of torpedo tokens on map, makes removal easier
    }

    let names = [];
    let errorMsg = [];
    let tips = [];
    let launchers = shooterObj.weaponArray[rackType];
    let totalRacks = launchers.length;

    for (let i=0;i<totalRacks;i++) {
        let weapon = launchers[i];
        let weaponNum = weapon.weaponNum;
        let fired = Attribute(shooterObj.characterid,"weapon" + weapon.weaponNum+"fired");
        if (fired === firedValue) {
            errorMsg.push(weapon.name + " is Empty");
            continue;
        }
        if (fired === destroyedValue) {
            errorMsg.push(weapon.name + " is out of commission!");
            continue;
        }
        if (weapon.arc.includes(shooterArc) === false) {
            errorMsg.push("Target is out of Arc of " + weapon.name);
            continue;
        }
        result.torpedoes += weapon.tubes;
        if (calling === "Firing") {
            AttributeSet(shooterObj.characterid,"weapon" + weapon.weaponNum+"fired",firedValue);
            //FX and Sound of launch
        }
        racks -= 1;
        if (racks < 1) {break};
    }

    if (result.torpedoes === 0 && errorMsg !== []) {
        for (let e=0;e<errorMsg.length;e++) {
            if (e>0) {result.errorMsg += "<br>"};
            result.errorMsg += errorMsg[e];
        }
        return result;
    }

    let difficulty;
    if (targetObj.token.get(sm.slow) === true || targetObj.token.get(sm.stopped) === true) {
        tips.push("Low Speed Target = Base 1");
        difficulty = 1;
    } else if (targetObj.token.get(sm.fast) === true) {
        tips.push("High Speed Target = Base 4");
        difficulty = 4;
    } else {
        tips.push("Normal Speed Target = Base 3");
        difficulty = 3;
    }

    if (mod === "JapanNight") {
        tips.push("Visibility at Night +1");
        difficulty += 1;
    }

    if (mod === "Radar") {
        tips.push("Radar Guided at Night +1");
        difficulty += 1;
    }

    if (targetArc === "Fore" || targetArc === "Aft") {
        difficulty += 1;
        tips.push("Small Aspect +1");
    }
    if ((shooterObj.nation === "US" && state.NIMITZ.period === "Early War") || (shooterObj.nation === "Germany")) {
        difficulty += 1;
        tips.push("Poor Quality Torpedoes +1");
    }

    if (shooterObj.nation === "Japan" && range > 12) {
        difficulty = 5;
        tips = ["Long Lance Torpedoes at Long Range Need 6s to Hit"];
    }

    difficulty = Math.min(Math.max(difficulty,0),5);
    result.tips = "Final Difficulty: " + difficulty;
    result.target = ToHit(difficulty,result.torpedoes);
    result.tips += "<br>Needing: " + result.target + "+"; 
    for (let i=0;i<tips.length;i++) {
        result.tips += "<br>" + tips[i];
    }
    return result;
}



const GunneryDifficulty = (shooterObj,targetObj,system,calling,range,arcs,mod) => {
    let shooterArc = arcs.shooter;
    let targetArc = arcs.target;
    let result = {
        difficulty: 0,
        arcs: arcs,
        totalTubes: 0,
        errorMsg: "",
        type: "",
        tips: "",
        needed: 7,
        guns: "",
        turrets: 0,
        pen: [],
    }

    let firedFlag = false;
    let arcFlag = false;
    let destroyedFlag = false;
    let tt = 0;
    let type;
    let errorMsg = [];
    let tips = [];
    if (system.includes("Primary")) {type = "Primary"} else {type = "Secondary"};

    weaponArray = shooterObj.weaponArray[type];

    for (let i=0;i<weaponArray.length;i++) {
        let weapon = weaponArray[i];
        let name = weapon.name;
        if (!name) {continue};
        let weaponNum = weapon.weaponNum;
        let fired = Attribute(shooterObj.characterid,"weapon" + weapon.weaponNum+"fired");
        if (fired === firedValue) {
            firedFlag = true;
            break;
        }
        if (fired === destroyedValue) {
            destroyedFlag = true;
            continue;
        }
        if (weapon.arc.includes(shooterArc) === false) {
            arcFlag = true;
            continue;
        }
        tt += weapon.tubes;
        result.guns += "<br>" + name;
        result.turrets += 1;
        if (weapon.type.includes("Large")) {
            result.type = "Large";
        } else if (weapon.type.includes("Small")) {
            result.type = "Small";
        } else if (weapon.type.includes("Casement")) {
            result.type = "Casement";
        }
        if (result.type === "Large") {
            if (range <= 12) {
                result.pen = weapon.shortPen;
            } else {
                result.pen = weapon.longPen;
            }
        } else {
            if (range <= 8) {
                result.pen = weapon.shortPen;
            } else {
                result.pen = weapon.longPen;
            }
        }

        if (calling === "Firing") {
            AttributeSet(shooterObj.characterid,"weapon" + weapon.weaponNum+"fired",firedValue);
            GunFX(shooterObj,targetObj,shooterArc,result.type,name);
        }
    }

    if (firedFlag === true) {
        errorMsg.push(system + " Guns have already fired this turn");
    }

    if (arcFlag === true && tt === 0) {
        errorMsg.push("Target is out of Arc");
    }

    if (destroyedFlag === true && tt === 0) {
        errorMsg.push("All Guns Out of Commission")
    }

    result.difficulty = parseInt(Attribute(shooterObj.characterid,"director"));
    tips.push("Director: " + result.difficulty);
    if (mod === "Secondary") {
        tips.push("Second Target +1");
        result.difficulty += 1;
    }

    if (mod === "JapanNight") {
        tips.push("Visibility at Night +1");
        result.difficulty += 1;
    }

    if (mod === "Radar") {
        tips.push("Radar Guided at Night +1");
        difficulty += 1;
    }

    if ((result.type === "Small" || result.type === "Casement") && range > 8) {
        result.difficulty += 2;
        tips.push("Range +2");
    } else {
        result.difficulty += 1;
        tips.push("Range +1");
    }
    if (targetArc === "Fore" || targetArc === "Aft") {
        result.difficulty += 1;
        tips.push("Small Aspect +1");
    }
    if (result.type === "Large" && targetObj.token.get(sm.fast) === true) {
        result.difficulty += 1;
        tips.push("Large Gun firing at Fast Target +1");
    }
    if (result.type === "Large" && shooterObj.token.get(sm.fast) === true) {
        result.difficulty += 1;
        tips.push("Large Gun fired by Fast Shooter +1");
    }
    if (result.type === "Casement") {
        result.difficulty += 1;
        tips.push("Casement +1");
    }
    if (targetObj.token.get(sm.slow) === true || targetObj.token.get(sm.stopped) === true) {
        result.difficulty -= 1;
        tips.push("Target Slow/Stopped -1");
    }

    result.difficulty = Math.min(Math.max(result.difficulty,0),5);

    result.tips = "Final Difficulty: " + result.difficulty;
    for (let i=0;i<tips.length;i++) {
        result.tips += "<br>" + tips[i];
    }

    result.errorMsg = errorMsg.toString();
    result.totalTubes = tt;
    result.needed = ToHit(result.difficulty,result.totalTubes)
    return result;
}

const ToHit = (difficulty,tubes) => {
    let needed;
    switch (difficulty) {
        case 0:
            needed = 2;
            break;
        case 1:
            if (tubes < 4) {needed = 4}
            if (tubes > 3 && tubes < 8) {needed = 3}
            if (tubes > 7) {needed = 2}
            break;
        case 2:
            if (tubes < 4) {needed = 5}
            if (tubes > 3 && tubes < 8) {needed = 4}
            if (tubes > 7 && tubes < 12) {needed = 3}
            if (tubes > 11) {needed = 2}
            break;
        case 3:
            if (tubes < 4) {needed = 6}
            if (tubes > 3 && tubes < 8) {needed = 5}
            if (tubes > 7 && tubes < 12) {needed = 4}
            if (tubes > 11) {needed = 3}
            break;
        case 4:
            if (tubes < 8) {needed = 6}
            if (tubes > 7 && tubes < 12) {needed = 5}
            if (tubes > 11) {needed = 4}
            break;
        case 5:
            needed = 6;
    }

    return needed;
}

const Weapons = (msg) => {
    let Tag = msg.content.split(";");
    let Type = Tag[1];
    let shooterID = Tag[2];
    let targetID = Tag[3];
    let system, racks;
    if (Type === "Gunnery") {
        system = Tag[4];
    }
    if (Type === "Torpedo") {
        system = "Torpedoes";
        racks = Tag[4];
        rackType = Tag[5];
    }

    let shooterObj = MOA[shooterID];
    if (!shooterObj) {
        //check if accidentally clicked on a firing cloud
        let stok = findObjs({_type:"graphic", id: shooterID})[0];
        shooterID = decodeURIComponent(stok.get("gmnotes"));
        shooterObj = MOA[shooterID];
        if (!shooterObj) {
            sendChat("","Error in Shooter");
            return;
        }
    }
    let targetObj = MOA[targetID];
    if (!targetObj) {
        //check if accidentally clicked on a firing cloud
        let ttok = findObjs({_type:"graphic", id: targetID})[0];
        targetID = decodeURIComponent(ttok.get("gmnotes"));
        targetObj = MOA[targetID];
        if (!targetObj) {
            sendChat("","Error in Target");
            return;
        }
    }
    let range = ShipDistance(shooterObj,targetObj);
    let arcs = ARCS(shooterObj,targetObj);
    let targetArc = arcs.target;
    let line;

    SetupCard(shooterObj.name,Type,shooterObj.nation);
    if (state.NIMITZ.phase !== Type) {
        outputCard.body.push("Invalid Phase");
        PrintCard();
        return;
    }
    outputCard.body.push("Targetting: " + targetObj.name);
    let yards = range * 1000;
    yards = yards.toLocaleString("en-US");
    let noun;
    if (system.includes("Large")) {
        if (range > 12) {noun = "Long"} else {noun = "Short"};
    } else {
        if (range > 8) {noun = "Long"} else {noun = "Short"};
    }

    outputCard.body.push("At " + noun + " Range: " + range + '" (' + yards + " yds)")
    if (targetObj.nation === shooterObj.nation) {
        outputCard.body.push("Friendly Fire!!");
        PrintCard();
        return;
    }

    let result;
    let mod = "";
    if (state.NIMITZ.darkness === true && range > 12 && targetObj.token.get(sm.flash) === false) {
        if (parseInt(Attribute(shooterObj.characterid,"director")) === -1 && state.NIMITZ.period === "Late War") {
            mod = "Radar";
        } else {
            if (shooterObj.nation !== "Japan") {
                outputCard.body.push("Can't Target that Ship due to Darkness");
                PrintCard();
                return;
            } else {
                mod = "JapanNight";
            }
        }
    }
    if (Type === "Torpedo") {
        if (range > 24 || (range > 12 && shooterObj.nation !== "Japan")) {
            outputCard.body.push("Target Not In Range of Torpedoes");
            PrintCard();
            return;
        }
        if (shooterObj.torpedoesFired === true) {
            outputCard.body.push("Unable to Target more than One Ship");
            PrintCard();
            return;
        }
        result = TorpedoDifficulty(shooterObj,targetObj,racks,rackType,"Firing",range,arcs,mod);
    } else if (Type === "Gunnery") {
        if (range > 24 || (range > 16 && system.includes("Secondary"))) {
            outputCard.body.push("Target Not In Range of " + system + " Guns");
            PrintCard();
            return;
        }
        if (system.includes("Primary") && shooterObj.primaryFired === true) {
            outputCard.body.push("Primary Guns Fired already this turn");
            PrintCard();
            return;
        }
        if (system.includes("Secondary") && shooterObj.secondaryFired === true) {
            mod = "Secondary";
        }
        result = GunneryDifficulty(shooterObj,targetObj,system,"Firing",range,arcs,mod);
    }

    if (result.errorMsg !== "") {
        outputCard.body.push(result.errorMsg);
        PrintCard();
        return;
    }

    if (Type === "Gunnery") {
        if (state.NIMITZ.darkness === true) {
            shooterObj.token.set(sm.flash,true);
        }
        let systemText;
        if (system.includes("Primary")) {
            systemText = "Primary"
            shooterObj.primaryFired = true
        };
        if (system.includes("Secondary")) {
            systemText = "Secondary"
            shooterObj.secondaryFired = true;
        }



        let roll = randomInteger(6);
        outputCard.body.push("Firing " + '[' + systemText + '](#" class="showtip" title="' + result.totalTubes + " Guns Total" + result.guns + ') ' + " Turrets/Guns");
        outputCard.body.push("Rolling: " + DisplayDice(roll,shooterObj.nation,16) + '  [Needing: ](#" class="showtip" title="' + result.tips + ') '+ result.needed + "+");
        if (roll < result.needed) {
            outputCard.body.push("Misses!");
            WeaponFX(shooterObj,targetObj,false,system,result.turrets);
        } else {
            outputCard.body.push("Hits!");
            outputCard.body.push("[hr]");
            damageResult = Damage(targetObj,result.pen,"Gun",targetArc);
            outputCard.body.push("Rolling: " + DisplayDice(damageResult.roll,shooterObj.nation,16) + " - " + '[Damage](#" class="showtip" title="' + damageResult.tips + ')');
            WeaponFX(shooterObj,targetObj,true,system,result.turrets);
            for (let d=0;d<damageResult.text.length;d++) {
                outputCard.body.push(damageResult.text[d])
            };
        }
    } else if (Type === "Torpedo") {
        shooterObj.torpedoesFired = true;
        outputCard.body.push("A Total of " + result.torpedoes + '[' + " Torpedoes" + '](#" class="showtip" title="' + result.tips + ') ' + " were launched");
        ids = PlaceTorpedoes(shooterObj,targetObj,result.torpedoes);
        result.ids = ids;
log(result)
        if (!torpedoArray[targetID]) {
            torpedoArray[targetID] = [];
        }
        torpedoArray[targetID].push(result);
    }
    PrintCard();
}

const Damage = (targetObj,pen,type,targetArc) => {
    //type is gun or bomb
    let damageRoll = randomInteger(6);
    let r = Math.round(damageRoll/2) - 1; //0 ref array
    let penResult = parseInt(pen[r]);
    let armour = parseInt(targetObj.armour);
    let damage;
    let cID = targetObj.characterid
    let result = [];
    let tips = "Pen Result " + penResult + " vs. Armour " + armour;
    let sunk = false;

    let directorMax = parseInt(Attribute(cID,"director",true));
    let directorColour = Attribute(cID,"directorcolour");
    let flak = parseInt(Attribute(cID,"flak"));
    let flakPos = parseInt(Attribute(cID,"flakposition"));
    let speed = parseInt(Attribute(cID,"speed"));
    let speedColour = Attribute(cID,"speedcolour");
    let speedLevels = Attribute(cID,"speedlevels").split("/");
    let bouyancy = targetObj.token.get("bar3_value");
    let flooding = false;

    let weaponArray = targetObj.weaponArray;


    if (penResult <= armour) {
        damage = 0;
    } else {
        damage = penResult - armour;
    }

    if (type === "Bomb") {
        damage = Math.max(1,damage);
    } 

    let critRoll1 = randomInteger(6);
    let critRoll2 = randomInteger(6);
    let critRollTotal = critRoll1 + critRoll2;
    tips += "<br>Critical Roll: " + critRollTotal;

    if (targetObj.type === "Carrier") {
        if (type === "Gun") {
            if (critRollTotal === 2 && flakPos === 2) {
                result.push("[#ff0000]Critical to AA Batteries[/#]");
                flak = Math.max(flak-1,0);
                AttributeSet(cID,"flak",flak);
                AttributeSet(cID,"flakposition",1);
            } else if (critRollTotal > 2 && critRollTotal < 6 && targetObj.armouredDeck === false) {
                result.push("[#ff0000]Plane Destroyed - Attacker Chooses[/#]");
            } else if (critRollTotal > 5 && critRollTotal < 9 && damage === 0) {
                damage = 1;
            } else if (critRollTotal > 8 && critRollTotal < 12) {
                result.push("[#ff0000]Plane Destroyed - Attacker Chooses[/#]");
            } else if (critRollTotal === 12) {
                result.push("[#ff0000]Catastrophic Explosion!");
                result.push("The ship’s magazine explodes, sinking her immediately[/#]");
                sunk = true;
            }
        } else if (type === "Bomb") {
            if (critRollTotal === 2 && flakPos === 2) {
                result.push("[#ff0000]Critical to AA Batteries[/#]");
                flak = Math.max(flak-1,0);
                AttributeSet(cID,"flak",flak);
                AttributeSet(cID,"flakposition",1);
            } else if (critRollTotal > 2 && critRollTotal < 6 && targetObj.armouredDeck === false) {
                result.push("[#ff0000]Plane Destroyed - Attacker Chooses[/#]");
            } else if (critRollTotal === 6) {
                damage += 2;
            } else if (critRollTotal === 7) {
                result.push("[#ff0000]Flooding in multiple compartments![/#]");
                flooding = true;
            } else if (critRollTotal === 8) {
                damage += 1;
            } else if (critRollTotal > 8 && critRollTotal < 12) {
                result.push("[#ff0000]Plane Destroyed - Attacker Chooses[/#]");
            } else if (critRollTotal === 12) {
                result.push("[#ff0000]Catastrophic Explosion!");
                result.push("The ship’s magazine explodes, sinking her immediately[/#]");
                sunk = true;
            }
        }




    } else if (targetObj.type === "Battleship" || targetObj.type === "Cruiser" || targetObj.type === "Destroyer") {
        if (type === "Gun") {
            if (critRollTotal < 4 && flakPos === 2) {
                result.push("[#ff0000]Critical to AA Batteries[/#]");
                flak = Math.max(flak-1,0);
                AttributeSet(cID,"flak",flak);
                AttributeSet(cID,"flakposition",1);
            } else if (critRollTotal === 4 && directorColour === "Max") {
                result.push("[#ff0000]Critical to the Bridge[/#]");
                director = directorMax + 1;
                AttributeSet(cID,"director",director);
                AttributeSet(cID,"directorcolour","Reduced");
            } else if (critRollTotal > 4 && critRollTotal < 7) {
                let possibles = [];
                let secondaries = weaponArray["Secondary"].length;
                for (let s=0;s<secondaries;s++) {
                    if (weaponArray["Secondary"][s].arc.includes(targetArc)) {
                        possibles.push(s);
                    }
                }
                if (possibles.length > 0) {
                    let roll = randomInteger(possibles.length) - 1;
                    let weapon = weaponArray["Secondary"][possibles[roll]];
                    if (weapon.type.includes("Casement")) {
                        let tubes = Attribute(cID,"weapon" + weapon.weaponNum + "tubes");
                        tubes -= 1;
                        AttributeSet(cID,"weapon" + weapon.weaponNum + "tubes",tubes);
                        AttributeSet(cID,"weapon" + weapon.weaponNum + "status","Damaged");
                        result.push("[#ff0000]A Gun from " + weapon.name + " is knocked out of commission![/#]");
                    } else {
                        AttributeSet(cID,"weapon" + weapon.weaponNum + "fired",destroyedValue);
                        AttributeSet(cID,"weapon" + weapon.weaponNum + "status","Destroyed");
                        result.push("[#ff0000]" + weapon.name + " is knocked out of commission![/#]");
                        weaponArray["Secondary"].splice(possibles[roll],1);
                    }
                }
            } else if (critRollTotal === 7 && damage === 0) {
                damage = 1;
            } else if (critRollTotal > 7 && critRollTotal < 10 && damage > 0) {
                let possibles = [];
                let primaries = weaponArray["Primary"].length;
                for (let p=0;p<primaries;p++) {
                    if (weaponArray["Primary"][p].arc.includes(targetArc)) {
                        possibles.push(p);
                    }
                }
                if (possibles.length > 0) {
                    let roll = randomInteger(possibles.length) - 1;
                    let weapon = weaponArray["Primary"][possibles[roll]];
                    AttributeSet(cID,"weapon" + weapon.weaponNum + "fired",destroyedValue);
                    AttributeSet(cID,"weapon" + weapon.weaponNum + "status","Destroyed");
                    result.push("[#ff0000]" + weapon.name + " is knocked out of commission![/#]");
                    weaponArray["Primary"].splice(possibles[roll],1);
                }
            } else if (critRollTotal > 9 && critRollTotal < 12) {
                let possibles = [];
                if (targetArc === "Port") {
                    possibles = weaponArray["Port Torpedoes"].concat(weaponArray["Port/Starboard Torpedoes"]);
                } else {
                    possibles = weaponArray["Starboard Torpedoes"].concat(weaponArray["Port/Starboard Torpedoes"])
                }
                if (possibles.length > 0) {
                    let roll = randomInteger(possibles.length) - 1;
                    let weaponNum = possibles[roll].weaponNum;
                    let weaponName = possibles[roll].name;
                    AttributeSet(cID,"weapon" + weaponNum + "fired",destroyedValue);
                    AttributeSet(cID,"weapon" + weaponNum + "status","Destroyed");
                    result.push("[#ff0000]" + weaponName + " is knocked out of commission![/#]");
                }
            } else if (critRollTotal === 12 && damage > 0) {
                result.push("Catastrophic Explosion!");
                result.push("[#ff0000]The ship’s magazine explodes, sinking her immediately[/#]");
                sunk = true;
            }
        } else if (type === "Bomb") {
            if (critRollTotal < 4 && flakPos === flakPosMax) {
                result.push("[#ff0000]Critical to AA Batteries[/#]");
                flak = Math.max(flak-1,0);
                AttributeSet(cID,"flak",flak);
                AttributeSet(cID,"flakposition",1);
            } else if (critRollTotal === 4) {
                let possibles = [];
                let secondaries = weaponArray["Secondary"].length;
                for (let s=0;s<secondaries;s++) {
                    if (weaponArray["Secondary"][s].arc.includes(targetArc)) {
                        possibles.push(s);
                    }
                }
                if (possibles.length > 0) {
                    let roll = randomInteger(possibles.length) - 1;
                    let weapon = weaponArray["Secondary"][possibles[roll]];
                    if (weapon.type.includes("Casement")) {
                        let tubes = Attribute(cID,"weapon" + weapon.weaponNum + "tubes");
                        tubes -= 1;
                        AttributeSet(cID,"weapon" + weapon.weaponNum + "tubes",tubes);
                        AttributeSet(cID,"weapon" + weapon.weaponNum + "status","Damaged");
                        result.push("A Gun from " + weapon.name + " is knocked out of commission![/#]");
                    } else {
                        AttributeSet(cID,"weapon" + weapon.weaponNum + "fired",destroyedValue);
                        AttributeSet(cID,"weapon" + weapon.weaponNum + "status","Destroyed");
                        result.push("[#ff0000]" + weapon.name + " is knocked out of commission![/#]");
                        weaponArray["Secondary"].splice(possibles[roll],1);
                    }
                }
            } else if (critRollTotal === 5) {
                let possibles = [];
                let primaries = weaponArray["Primary"].length;
                for (let p=0;p<primaries;p++) {
                    if (weaponArray["Primary"][p].arc.includes(targetArc)) {
                        possibles.push(p);
                    }
                }
                if (possibles.length > 0) {
                    let roll = randomInteger(possibles.length) - 1;
                    let weapon = weaponArray["Primary"][possibles[roll]];
                    AttributeSet(cID,"weapon" + weapon.weaponNum + "fired",destroyedValue);
                    AttributeSet(cID,"weapon" + weapon.weaponNum + "status","Destroyed");
                    result.push("[#ff0000]" + weapon.name + " is knocked out of commission![/#]");
                    weaponArray["Primary"].splice(possibles[roll],1);
                }
            } else if (critRollTotal === 6) {
                damage += 2;
            } else if (critRollTotal === 7 && damage === 0) {
                result.push("[#ff0000]Flooding in multiple compartments![/#]");
                flooding = true;
            } else if (critRollTotal > 7 && critRollTotal < 10) {
                damage += 1;
            } else if (critRollTotal > 9 && critRollTotal < 12) {
                let possibles = [];
                if (targetArc === "Port") {
                    possibles = weaponArray["Port Torpedoes"].concat(weaponArray["Port/Starboard Torpedoes"]);
                } else {
                    possibles = weaponArray["Starboard Torpedoes"].concat(weaponArray["Port/Starboard Torpedoes"])
                }
                if (possibles.length > 0) {
                    let roll = randomInteger(possibles.length) - 1;
                    let weaponNum = possibles[roll].weaponNum;
                    let weaponName = possibles[roll].name;
                    AttributeSet(cID,"weapon" + weaponNum + "fired",destroyedValue);
                    AttributeSet(cID,"weapon" + weaponNum + "status","Destroyed");
                    result.push("[#ff0000]" +weaponName + " is knocked out of commission![/#]");
                }
            } else if (critRollTotal === 12 && damage > 0) {
                result.push("[#ff0000]Catastrophic Explosion!");
                result.push("The ship’s magazine explodes, sinking her immediately[/#]");
                sunk = true;
            }
        }
    }

    if (flooding === true) {
        bouyancy -= 1;
        targetObj.token.set("bar3_value",bouyancy);
        if (bouyancy < 1) {
            sunk = true;
        } else {
            result.push("[#ff0000]The Flooding and damage reduces Speed and Bouyancy[/#]");
            let sl = speedLevels.length - bouyancy;
            let speed = parseInt(speedLevels[sl]);
            targetObj.token.set(sm.fast,false);
            if (speed < 6) {
                targetObj.token.set(sm.slow,true);
            }
            AttributeSet(cID,"speed",speed,true);
            AttributeSet(cID,"speedcolour","Reduced");
            AttributeSet(cID,"bouycolour","Reduced");
        }
    }

    let structure = targetObj.token.get("bar1_value");
    structure -= damage;
    targetObj.token.set("bar1_value",structure);
    if (sunk === true || structure < 1) {
        result = [targetObj.name + " Sinks!"];
        PlaySound("Sinking");
        SinkShip(targetObj);    
    } else if (damage === 0) {
        result.unshift("No Structural Damage was inflicted");
    } else if (damage > 0) {
        result.unshift(damage + " Structure Damage was inflicted");
        let structureColour = "Reduced";
        if (targetObj.type === "Destroyer" && structure <= 2) {
            structureColour = "Low";
        } else if (targetObj.type !== "Destroyer" && structure <= 3) {
            structureColour = "Low";
        }
        AttributeSet(cID,"structurecolour",structureColour);

        if (structureColour === "Low" && targetObj.crippled === false) {
            targetObj.crippled = true;
            result.push(targetObj.name + ' is crippled!');
            result.push("[#ff0000]Speed, Flak and Fire Direction are all impacted[/#]");
            //red values for its directors, flak, and top speed.
            director = directorMax + 1;
            AttributeSet(cID,"director",director);
            AttributeSet(cID,"directorcolour","Reduced");
            
            if (flakPos === 2) {
                flak = Math.max(flak-1,0);
                AttributeSet(cID,"flak",flak);
                AttributeSet(cID,"flakposition",1);
            }
            
            speed = parseInt(targetObj.speedLevels[targetObj.speedLevels.length - 1]);
            targetObj.token.set(sm.fast,false);
            if (speed < 6) {
                targetObj.token.set(sm.slow,true);
            }
            AttributeSet(cID,"speed",speed,true);
            AttributeSet(cID,"speedcolour","Reduced");
        }
    }

    let res = {
        text: result,
        tips: tips,
        roll: damageRoll,
    }

    return res;
}

const TorpedoDamage = (targetObj,attack) => {
    let damageRoll = randomInteger(6);
    let pen;
    switch (attack.shooterNation) {
        case "Japan":
            if (attack.shooterType === "Plane") {
                pen = 3;
            } else {
                pen = 5;
            }
            break;
        case "Italy":
            pen = 4;
            break;
        case "Germany":
            pen = 3;
            break;
        case "US":
            pen = 2;
            break;
        case "UK":
            pen = 3;
            break;
    }

    let armour = parseInt(targetObj.armour);
    let damage;
    let cID = targetObj.characterid
    let result = [];
    let penResult = pen + damageRoll;
    let tips = "Pen Result " + penResult + " vs. Armour " + armour;
    let sunk = false;

    let directorMax = parseInt(Attribute(cID,"director",true));
    let directorColour = Attribute(cID,"directorcolour");
    let flak = parseInt(Attribute(cID,"flak"));
    let flakPosMax = parseInt(Attribute(cID,"flakposition",true));
    let flakPos = parseInt(Attribute(cID,"flakposition"));
    let speedColour = Attribute(cID,"speedcolour");
    let speedLevels = Attribute(cID,"speedlevels").split("/");

    if (penResult <= armour) {
        let structure = targetObj.token.get("bar1_value");
        structure -= 1;
        result = ["A Glancing Hit, 1 Structure Damage was inflicted"];
        targetObj.token.set("bar1_value",structure);
        let structureColour = "Reduced";
        if (targetObj.type === "Destroyer" && structure <= 2) {
            structureColour = "Low";
        } else if (structure <= 3) {
            structureColour = "Low";
        }
        AttributeSet(cID,"structurecolour",structureColour);
        if (structureColour === "Low" && targetObj.crippled === false) {
            targetObj.crippled = true;
            result.push(targetObj.name + ' is crippled!');
            result.push("Speed, Flak and Fire Direction all impacted");
            //red values for its directors, flak, and top speed.
            director = directorMax + 1;
            AttributeSet(cID,"director",director);
            AttributeSet(cID,"directorcolour","Reduced");

            if (flakPos === 2) {
                flak = Math.max(flak-1,0);
                AttributeSet(cID,"flak",flak);
                AttributeSet(cID,"flakposition",1);
            }
            let speed = parseInt(targetObj.speedLevels[targetObj.speedLevels.length - 1]);
            targetObj.token.set(sm.fast,false);
            if (speed < 6) {
                targetObj.token.set(sm.slow,true);
            }
            AttributeSet(cID,"speed",speed,true);
            AttributeSet(cID,"speedcolour","Reduced");
        }
    } else {
        let bouyancy = targetObj.token.get("bar3_value");
        bouyancy -= 1;
        targetObj.token.set("bar3_value",bouyancy);
        if (penResult > armour + 5) {
            sunk = true;
            result.push("The Torpedo breaks the Keel of the Ship, it sinks Immediately!");
        } else if (bouyancy < 1) {
            sunk = true;
            result.push("The flooding and explosions result in the Ship sinking!");
        } else {
            result.push("The ship survives the Torpedo hit, although Flooding and damage reduces Speed and Bouyancy");
            let sl = speedLevels.length - bouyancy;
            let speed = parseInt(speedLevels[sl]);
            targetObj.token.set(sm.fast,false);
            if (speed < 6) {
                targetObj.token.set(sm.slow,true);
            }
            AttributeSet(cID,"speed",speed,true);
            AttributeSet(cID,"speedcolour","Reduced");
            AttributeSet(cID,"bouycolour","Reduced");
            PlaySound("TorpedoExplosion")
        }
        if (sunk === true) {
            PlaySound("Sinking");
            SinkShip(targetObj);
        } 
    }

    let res = {
        text: result,
        tips: tips,
        roll: damageRoll,
    }

    return res;
}

const PlaceTorpedoes = (shooterObj,targetObj,number) => {
    let point1 = shooterObj.location;
    let point2 = targetObj.location;
    let pt1,pt2;
    let ids = [];
    //check distance between 2, shorten if needed
    let x = point1.x - point2.x;
    let y = point1.y - point2.y;
    let z = Math.sqrt(x*x + y*y); //in pixels , gives a min size
    let length = Math.max(0,Math.min(z-100,200));
    let ratio = (z - length)/z;
    let theta = TokenAngle(point1,point2);
    let offsets = [0.5,0.6,0.4,0.7,0.3,0.8,0.2,0.9,0.1,0,1];
    number = Math.min(number,11);
    let img = getCleanImgSrc("https://s3.amazonaws.com/files.d20.io/images/335639655/ckUlaPtRPN1mPg2thfUISw/thumb.png?1680487915");
    for (let i=0;i<number;i++) {
        let refPoint = DrawingPoint(targetObj,offsets[i]);
        let centre = FindPointOnLine(point1,refPoint,ratio);
        let angle = TokenAngle(point1,refPoint);
        let newToken = createObj("graphic", {   
            left: centre.x,
            top: centre.y,
            width: 30, 
            height: length,  
            rotation: angle,
            name: "Torpedo",
            isdrawing: true,
            pageid: Campaign().get("playerpageid"),
            imgsrc: img,
            layer: "map",
        });
        toFront(newToken);
        ids.push(newToken.get("id"));
    }
    return ids;
}


const TokenInfo = (msg) => {
    let id = msg.selected[0]._id;
    let token = findObjs({_type:"graphic", id: id})[0];
    SetupCard("Token Info","",'Neutral');
    outputCard.body.push(token.get("name"))
    outputCard.body.push("Token Location: " + token.get("left") + "/" + token.get("top"));
    let obj = MOA[id];
    if (!obj) {
        outputCard.body.push("Not in MOA");
    } else {
        outputCard.body.push("Object Location: " + obj.location.x + "/" + obj.location.y);
    }
    PrintCard();
}

const SinkShip = (targetObj) => {
    let token = targetObj.token;

    let wreckimg = "https://s3.amazonaws.com/files.d20.io/images/325937/sYfLIEiSGafysmejEzjwUg/thumb.png?1351492647";
    let blastimg = "https://s3.amazonaws.com/files.d20.io/images/2795502/nrrqUt3HwjLE_WRdr8aSHQ/thumb.png?1390101885";

    let ratio = Math.min(((targetObj.token.get("height")/70)-1),3);
    let wrecklength = parseInt(targetObj.token.get("height")) * 0.6;
    let wreckwidth = ratio * 10;
    let blastdim = ratio * 25;

    let wreckToken = createObj("graphic", {   
        left: targetObj.location.x,
        top: targetObj.location.y,
        width: wreckwidth, 
        height: wrecklength,  
        rotation: targetObj.token.get("rotation"),
        name: "Wreck",
        isdrawing: true,
        pageid: Campaign().get("playerpageid"),
        imgsrc: wreckimg,
        layer: "map",
    });
    toFront(wreckToken);
    let blastToken = createObj("graphic", {   
        left: targetObj.location.x,
        top: targetObj.location.y,
        width: blastdim, 
        height: blastdim,  
        rotation: 0,
        name: "Wreck",
        isdrawing: true,
        pageid: Campaign().get("playerpageid"),
        imgsrc: blastimg,
        layer: "map",
    });
    toFront(blastToken);

    token.remove();
    delete MOA[targetObj.id];
    
}


const RemoveMapTokens = () => {
    let mapTokens = findObjs({
        _pageid: Campaign().get("playerpageid"),
        _type: "graphic",
        _subtype: "token",
        layer: "map",
    })    

    mapTokens.forEach((token) => {
        if (token.get("name") === "Torpedo" || token.get("name") === "Wreck") {
            token.remove();
            return;
        }
    })
}

const ResolveTorpedoes = () => {
    let keys = Object.keys(torpedoArray);
    let id = keys[0];
    let torpedoAttacks = DeepCopy(torpedoArray[id]);
    delete torpedoArray[id];
    if (id) {
        PlaySound("TorpedoIncoming");
        let torpedoIDs = [];
        let targetObj = MOA[id];
        if (targetObj) {
            sendPing(targetObj.location.x,targetObj.location.y, Campaign().get('playerpageid'), null, true);            
            SetupCard(targetObj.name,"Torpedos!",targetObj.nation);
            for (let i=0;i<torpedoAttacks.length;i++) {
                torpedoIDs = torpedoIDs.concat(torpedoAttacks[i].ids);
                if (!MOA[id]) {continue}; //in case sunk already
                let attack = torpedoAttacks[i];
                if (torpedoAttacks.length > 1) {
                    if (i>0) {outputCard.body.push("[hr]")}
                    outputCard.body.push("Attack #" + (i+1));
                }
                outputCard.body.push(attack.torpedoes + " torpedoes were fired");
                let roll = randomInteger(6);
                outputCard.body.push("Rolling: " + DisplayDice(roll,attack.shooterNation,16) + '  [Needing: ](#" class="showtip" title="' + attack.tips + ') '+ attack.target + "+");
                if (roll < attack.target) {
                    outputCard.body.push("All Torpedoes Miss!");
                } else {
                    outputCard.body.push("Hits!");
                    outputCard.body.push("[hr]");
                    damageResult = TorpedoDamage(targetObj,attack);
                    outputCard.body.push("Rolling: " + DisplayDice(damageResult.roll,attack.shooterNation,16) + " - " + '[Damage](#" class="showtip" title="' + damageResult.tips + ')');
                    //FX, Sound
                    for (let d=0;d<damageResult.text.length;d++) {
                        outputCard.body.push(damageResult.text[d])
                    };
                }
            } //end torpedo attacks
            for (let t=0;t<torpedoIDs.length;t++) {
                let tok = findObjs({_type:"graphic", id: torpedoIDs[t]})[0];
                tok.remove();
            }
            if (keys.length > 1) {
                outputCard.body.push("[hr]");
                outputCard.body.push("Click Button when Ready");
                ButtonInfo("Next Ship","!ResolveTorpedoes");
            } else {
                outputCard.body.push("No More to Resolve");
                outputCard.body.push("Can Advance Phase when Ready");
                state.NIMITZ.torpedoes = {};
            }
            PrintCard();
        }
    } else {
        SetupCard("Resolve Torpedoes","","Neutral");
        outputCard.body.push("No More to Resolve");
        outputCard.body.push("Can Advance Phase when Ready");
        torpedoArray = {};
        PrintCard();
        return;
    }
}





    const destroyGraphic = (tok) => {
        let character = getObj("character", tok.get("represents"));   
        let type = Attribute(character.id,"type");
        if (shipTypes.includes(type)) {
            ResetWeapons(character);
            ResetDamage(character);
        }
        delete MOA[tok.id];
    }



    const changeGraphic = (tok,prev) => {
        if (tok.get('subtype') === "token") {       
            let character = getObj("character", tok.get("represents"));   
            if (!character) {return};
            let obj = MOA[tok.id];
            if (!obj) {
                addToken(tok);
                obj = MOA[tok.id];
                if (!obj) {return};
            }

            if ((tok.get("left") !== prev.left) || (tok.get("top") !== prev.top) || (tok.get("rotation") !== prev.rotation)) {
                if (shipTypes.includes(obj.type)) {
                    if (state.NIMITZ.testing === "On" || state.NIMITZ.turn === 0) {
                        obj.location = new Point(tok.get("left"),tok.get("top"));
                        obj.vertices = TokenVertices[tok];
                    } else {
                        tok.set({
                            left: prev.left,
                            top: prev.top,
                            rotation: prev.rotation,
                        });
                    }
                    return;
                } 
            }
        }




    }



    const handleInput = (msg) => {
        if (msg.type !== "api") {
            return;
        }
        let args = msg.content.split(";");
        log(args);
        switch(args[0]) {
            case '!Dump':
                log("STATE")
                log(state.NIMITZ);
                log("Token Array")
                log(MOA);
                break;
            case '!StartNewGame':
                StartNewGame(msg);
                break;
            case '!AdvancePhase':
                AdvancePhase();
                break;
            case '!Weapons':
                Weapons(msg);
                break;
            case '!Initiative':
                Initiative(msg);
                break;
            case '!ShipMove':
                ShipMove(msg);
                break;
            case '!ShipTurn':
                ShipTurn(msg);
                break;
            case '!TokenInfo':
                TokenInfo(msg);
                break
            case '!WeaponsInfo':
                WeaponsInfo(msg);
                break;
            case '!AddAbilities':
                AddAbilities(msg);
                break;
            case '!RemoveLines':
                RemoveLines();
                break;
            case '!DrawQuadrants':
                DrawQuadrants();
                break;
            case '!ResolveTorpedoes':
                ResolveTorpedoes();
                break;
            case '!CentreMap':
                CentreMap();
                break;
        }
    };
    const registerEventHandlers = () => {
        on('chat:message', handleInput);
        on('change:graphic',changeGraphic);
        //on('destroy:graphic',destroyGraphic);
    };
    on('ready', () => {
        log("===> NIMITZ Version: " + version + " <==");
        LoadPage();
        Arrays();
        registerEventHandlers();
        sendChat("","API Ready")
        log("On Ready Done")

    });
    return {
        // Public interface here
    };
})();