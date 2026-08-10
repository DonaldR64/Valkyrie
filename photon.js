//Helm;?{Thrust - Current Speed 4|+3|+2|+1|0|-1|-2|-3};?{Course|Ahead,Ahead|Port,?{Points&#124;1&#124;2&#124;3&#124&#125;|Starboard,?{Points&#124;1&#124;2&#124;3&#124&#125;}


const CreateHelmOrder = (ship) => {
	let helmID = state.FullThrust.shipState[ship.id].helmID;
	if (helmID) {
		let helmObj = findObjs({_type: "ability", _characterid: ship.charID, _id: helmID});
		helmObj.remove();
	}
	let currentSpeed = parseInt(ship.token.get("bar3_value"));
	let thrust = parseInt(ship.maxThrust);
	let impulse1 = Attribute(values.impulse1) === "Offline" ? false:true;
	let impulse2 = Attribute(values.impulse2) === "Offline" ? false:true;
	if (impulse1 === false || impulse2 === false) {
		thrust = Math.round(thrust/2);
	}
	if (impulse1 === false && impulse2 === false) {
		thrust = 0;
	}
	let turnPts = Math.round(thrust/turn);

	let part = "?{Thrust - Current Speed: " + currentSpeed;
	for (let i=thrust;i>= (-thrust);i--) {
		part += "|" + i;
	}
	part += "};?{Course|Ahead,Ahead|Port,?{Points";
	for (let i=1;i<=turnPts;i++) {
		part += "&#124;" + i;
	}
	part += "&#125;|Starboard,?{Points";
	for (let i=1;i<=turnPts;i++) {
		part += "&#124;" + i;
	}
	part += "&#125;}";
	action = "!Helm;@{selected|token_id};" + part;
	helmID = AddAbility("Helm",action,ship.charID);
	state.FullThrust.shipState[ship.id].helmID = helmID;
}