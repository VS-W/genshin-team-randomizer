let settings = {};
let gameData = false;

getData().then((res) => {
	gameData = res;

	addPatchesToSelect(gameData["patch"]);
	setStartDate(gameData["characters"]);

	runFilters(true);
});

toggleTeamTypeButtons();
toggleEnableCheckboxes();
toggleBetweenRadios();
teamNumberBasedSettings(initialize = true);
gatherSettings();

document.querySelector("#generate-team-btn").addEventListener("click", () => {
	generateTeam();
});

function randomFromArray(arr) {
	return arr[Math.floor(Math.random() * arr.length)]
}

function generateTeam() {
	const chars = runFilters();
	const totalValidChars = (settings["team-type"] == "coop") ? settings["number-of-teams"] * 4 : Object.keys(chars).filter(char => {
		if (chars[char]) {
			return char;
		}
	}).length;

	const teams = [];
	let currentTeamCount = 0, currentTeamHasTraveler = false, currentTeam = [], currentGenerationHasTraveler = false;
	for (let i = 0; i < totalValidChars; i++) {
		let remainingChars = Object.keys(chars).filter(char => {
			if (chars[char]) {
				if (settings["traveler-multielement"]
					&& gameData["processedCharacters"][char].name.includes("Traveler")
					&& currentGenerationHasTraveler) {

					return;
				}
				if (settings["team-type"] == "coop") {
					return char;
				}
				if (!(currentTeamHasTraveler && gameData["processedCharacters"][char].name.includes("Traveler"))) {
					return char;
				}
			}
		});

		const chosenChar = randomFromArray(remainingChars);
		if (chosenChar) {
			currentTeam.push(chosenChar);
			
			if (!(settings["team-type"] == "coop")) {
				chars[chosenChar] = false;
			}
			if (gameData["processedCharacters"][chosenChar].name.includes("Traveler")) {
				currentTeamHasTraveler = true;
				currentGenerationHasTraveler = true;
			}

			currentTeamCount += 1;
			if (currentTeamCount == 4) {
				teams.push(currentTeam);
				currentTeam = [];
				currentTeamCount = 0;
				currentTeamHasTraveler = false;
			}
		}
	}
	
	if (currentTeam.length > 0) {
		teams.push(currentTeam);
	}

	const container = document.querySelector("#generated-card-container");
	container.replaceChildren();

	let targetInfo = ``;
	if (settings["targets"].length > 0) {
		targetInfo = `${getRandomTarget()}`;
	}

	let teamIndex = 0, total = 0;
	teams.forEach(team => {
		total += team.length;
		teamIndex += 1;
		if (teamIndex > ((settings["team-type"] == "abyss") ? (settings["number-of-teams"] * 2) : settings["number-of-teams"])) {
			return;
		}
		const teamContainer = document.createElement("div");
		teamContainer.classList.add("generated-team-container");
		let lastID = 0;
		for (let i = 0; i < team.length; i++) {
			makeGeneratedCard(gameData["processedCharacters"][team[i]], teamContainer, `${teamIndex}-${i}`);
			lastID = i + 1;
		}
		if (team.length > 0 && team.length < 4) {
			for (let i = 0; i < (4 - team.length); i++) {
				let blankChar = {
					"icon": "Background_Item_1_Star.png",
					"name": "---",
					"rarity": "5",
					"element": "Blank",
					"weapon": "Blank"
				};
				makeGeneratedCard(blankChar, teamContainer, `${teamIndex}-${i + lastID}`);
			}
		}
		container.appendChild(teamContainer);
		let delay = 0;
		container.querySelectorAll(".character-card").forEach(card => {
			if (card.classList.contains("opacity-zero")) {
				setTimeout(() => {
					card.classList.remove("opacity-zero");
					card.classList.add("rotate3d-appear");
				}, delay);
				delay += 100;
				if (delay > 300) {
					delay = 0;
				}
			}
		});

		if (!(settings["random-weapon-type"] == "disabled")) {
			makeTeamWeaponInfobox(container);
		}

		if (!(settings["team-type"] == "abyss") || (settings["team-type"] == "abyss" && teamIndex % 2 == 0)) {
			makeTeamInfobox(container, teamIndex, targetInfo);
			container.appendChild(document.createElement("hr"));
		}
		
		if (settings["target-multiteam"] && settings["targets"].length > 0) {
			targetInfo = `${getRandomTarget()}`;
		}
	});

	fitty(".generated-character-card-title-text", {
		minSize: 10,
		maxSize: 16,
		multiLine: true
	});
}

function makeDomainDisplay(type, target) {
	const domain = gameData["domains"][type][target];
	return `
		<div class="domain-type">${type.replace("Domains", "Domain")}</div>
		<div class="domain-title">${domain["name"]}</div>
		<div class="domain-location">${domain["location"].join(", ")}</div>
		<div class="domain-region">${domain["region"]}</div>
	`;
}

function makeBossDisplay(type, target) {
	const boss = gameData[type][target];
	const color1 = Object.keys(gameData[type][target]).includes("color") ? "color-" + gameData[type][target]["color"][0] : "";
	const color2 = color1.length > 0 && gameData[type][target]["color"].length > 1 ? "color-" + gameData[type][target]["color"][1] : color1;
	switch (type) {
		case "overworld_bosses":
			return `
				<div class="boss-info-container">
					<div class="boss-img-container">
						<img class="boss-img" src="${"assets/icons/" + boss["icon"]}">
					</div>
					<div class="boss-detail-container">
						<div class="boss-title ${color1}">${boss["name"]}</div>
						<div class="boss-location">${boss["location"]}</div>
						<div class="boss-region">${boss["region"]}</div>
					</div>
				</div>
			`;
		case "weekly_bosses":
			return `
				<div class="boss-info-container">
					<div class="boss-img-container">
						<img class="boss-img" src="${"assets/weeklybossfullart/" + boss["fullart"]}">
					</div>
					<div class="boss-detail-container">
						<div class="boss-title ${color1}">${boss["name"]}</div>
						<div class="boss-subtitle ${color2}">${boss["subtitle"]}</div>
						<div class="boss-location">${boss["location"]}</div>
						<div class="boss-region">${boss["region"]}</div>
					</div>
				</div>
			`;
	}
}

function getRandomTarget() {
	if (settings["team-type"] == "abyss") {
		return `
			<div class="abyss-title">Abyss</div>
			<div class="abyss-floor">Floor ${[9, 10, 11, 12][document.querySelectorAll(".target-infobox").length % 4]}</div>
		`;
	}
	const possibleTargets = settings["targets"];
	if (settings["team-type"] == "coop" && possibleTargets.includes("target-abyss")) {
		if (possibleTargets.length > 1) {
			possibleTargets.splice(possibleTargets.indexOf("target-abyss"), 1);
		} else {
			return ``;
		}
	}
	const target = randomFromArray(possibleTargets);
	switch (target) {
		case "target-abyss":
			const floors = [9, 10, 11, 12];
			return `
				<div class="abyss-title">Abyss</div>
				<div class="abyss-floor">Floor ${randomFromArray(floors)} / ${randomFromArray(["First Half", "Second Half"])}</div>
			`;
		case "target-overworld":
			return makeBossDisplay("overworld_bosses", randomFromArray(Object.keys(gameData["overworld_bosses"])));
		case "target-weekly":
			// Can't do Dvalin in co-op.
			const possibleWeeklyBosses = Object.keys(gameData["weekly_bosses"]);
			if (settings["team-type"] == "coop") {
				possibleWeeklyBosses.splice(possibleWeeklyBosses.indexOf("Stormterror Dvalin"), 1);
			}
			return makeBossDisplay("weekly_bosses", randomFromArray(possibleWeeklyBosses));
		case "target-domain":
			const randomDomainType = randomFromArray(Object.keys(gameData["domains"]).filter(key => key !== "One-Time Domains"));
			const targetDomain = randomFromArray(Object.keys(gameData["domains"][randomDomainType]));
			
			return makeDomainDisplay(randomDomainType, targetDomain);
		case "target-onetime-domain":
			const onetimeDomainTarget = randomFromArray(Object.keys(gameData["domains"]["One-Time Domains"]));

			return makeDomainDisplay("One-Time Domains", onetimeDomainTarget);
	}
}

function makeTeamInfobox(container, teamIndex, targetInfo) {
	const template = `
		<span>
			Team #${(settings["team-type"] == "abyss") ? teamIndex / 2 : teamIndex}
			${targetInfo.length > 0 ? " - Target:" : ""}
		</span>
	` + targetInfo;
	const htmlElement = document.createElement("div");
	htmlElement.innerHTML = template;
	htmlElement.classList.add("generated-team-divider");
	htmlElement.classList.add("target-infobox");

	container.appendChild(htmlElement);
}

function makeTeamWeaponInfobox(container) {
	let rarities = [];
	if (settings["random-weapon-type"] == "random-single") {
		const singleRarity = randomFromArray(settings["random-weapon-stars"]);
		for (let i = 0; i < 4; i++) {
			rarities.push(singleRarity);
		}
	} else if (settings["random-weapon-type"] == "random-varied") {
		for (let i = 0; i < 4; i++) {
			rarities.push(randomFromArray(settings["random-weapon-stars"]));
		}
	}
	const template = `
		<span>Using weapons of rarity:</span>
		<div class="blank-card-text-container">
			<span class="blank-card-text">${rarities[0]} <img src="assets/icons/Icon_1_Star.png"></span>
			<span class="blank-card-text">${rarities[1]} <img src="assets/icons/Icon_1_Star.png"></span>
			<span class="blank-card-text">${rarities[2]} <img src="assets/icons/Icon_1_Star.png"></span>
			<span class="blank-card-text">${rarities[3]} <img src="assets/icons/Icon_1_Star.png"></span>
		</div>
	`;
	const htmlElement = document.createElement("div");
	htmlElement.innerHTML = template;
	htmlElement.classList.add("generated-team-divider");
	htmlElement.classList.add("random-weapon-infobox");

	container.appendChild(htmlElement);
}

function makeGeneratedCard(character, container, idNum) {
	const element = character["element"],
		weapon = character["weapon"],
		// icon = "Background_Item_1_Star.png",
		icon = character["icon"],
		name = shortNameMap(character["name"]),
		star = character["rarity"];
	const template = `
		<div class="character-card-icon-container">
			<img class="character-card-icon character-card-icon-element" src="assets/icons/${element}.png">
			<img class="character-card-icon character-card-icon-weapon" src="assets/icons/${weapon}.png">
		</div>
		<img class="character-card-profile-${star}" src="assets/icons/${icon}">
		<div class="character-card-title"><span class="character-card-title-text generated-character-card-title-text">&thinsp;${name}&thinsp;</span></div>
	`;
	const htmlElement = document.createElement("div");
	htmlElement.innerHTML = template;
	htmlElement.role = "button";
	htmlElement.classList.add("character-card");
	htmlElement.classList.add("opacity-zero");
	htmlElement.id = "generated_" + idNum;

	container.appendChild(htmlElement);
}

function setSelectedTraveler(traveler) {
	Object.keys(gameData["processedCharacters"]).forEach(char => {
		if (gameData["processedCharacters"][char].name.includes("Traveler")) {
			if (!settings["traveler"].includes("Both")) {
				if (!gameData["processedCharacters"][char].name.includes(traveler)) {
					gameData["processedCharacters"][char].forcedDisabled = true;
					gameData["processedCharacters"][char].htmlElement.classList.add("character-card-forced-disabled");
				} else {
					gameData["processedCharacters"][char].forcedDisabled = false;
					gameData["processedCharacters"][char].htmlElement.classList.remove("character-card-forced-disabled");
				}
			} else {
				gameData["processedCharacters"][char].forcedDisabled = false;
				gameData["processedCharacters"][char].htmlElement.classList.remove("character-card-forced-disabled");
			}
		}
	});
}

function teamNumberBasedSettings(initialize = false) {
	const targetElement = document.querySelector("input[name='number-of-teams']");
	if (initialize) {
		targetElement.addEventListener("change", () => {
			teamNumberBasedSettings();
		});
	}
	
	settings["number-of-teams"] = targetElement.value;

	if (settings["number-of-teams"] > 1) {
		document.querySelector("input[name='target-multiteam']").parentElement.setAttribute("aria-disabled", "false");
		document.querySelector("input[name='traveler-multielement']").parentElement.setAttribute("aria-disabled", "false");
	} else {
		targetElement.value = "1";
		settings["number-of-teams"] = 1;
		document.querySelector("input[name='target-multiteam']").parentElement.setAttribute("aria-disabled", "true");
		document.querySelector("input[name='traveler-multielement']").parentElement.setAttribute("aria-disabled", "true");
	}
}

function runFilters(initialize = false) {
	gatherSettings();
	setSelectedTraveler(settings["traveler"]);

	const batchFilters = {
		"element-filter": [],
		"weapon-filter": [],
		"rarity-filter": [],
		"region-filter": [],
		"model-filter": []
	};

	let chars = {}, charKeys = Object.keys(gameData["processedCharacters"]);
	charKeys.forEach(char => {
		chars[char] = true;
	});

	Object.keys(batchFilters).forEach(filter => {
		const filterContainer = document.querySelector(`#${filter}`);
		filterContainer.querySelectorAll("input:checked").forEach(checkbox => {
			batchFilters[filter].push(checkbox.id);
		});
		if (initialize) {
			filterContainer.querySelectorAll("input").forEach(checkbox => {
				checkbox.addEventListener("change", () => {runFilters();});
			});
		}
	});

	if (initialize) {
		[].concat(
			Array.from(document.querySelectorAll("input[type='radio'][name='patch']")),
			Array.from(document.querySelectorAll("input[type='radio'][name='release-date']")),
			[document.querySelector("#patch-select-1"), document.querySelector("#patch-select-2")],
			[document.querySelector("#release-date-select-1"), document.querySelector("#release-date-select-2")],
			[document.querySelector("input[name='traveler-region']")],
			Array.from(document.querySelectorAll("input[name='traveler']"))
		).forEach(input => {
			input.addEventListener("change", () => {
				runFilters();
			});
		});

		document.querySelector("#filter-select-all").addEventListener("click", () => {
			Object.keys(batchFilters).forEach(filter => {
				const filterContainer = document.querySelector(`#${filter}`);
				filterContainer.querySelectorAll("input").forEach(checkbox => {
					checkbox.checked = true;
				});
			});
			runFilters();
		});

		document.querySelector("#filter-select-none").addEventListener("click", () => {
			Object.keys(batchFilters).forEach(filter => {
				const filterContainer = document.querySelector(`#${filter}`);
				filterContainer.querySelectorAll("input").forEach(checkbox => {
					checkbox.checked = false;
				});
			});			
			runFilters();
		});

		document.querySelector("#character-select-all").addEventListener("click", () => {
			Object.keys(chars).forEach(char => {
				gameData["processedCharacters"][char].disabled = false;
				gameData["processedCharacters"][char].htmlElement.classList.remove("character-card-disabled");
			});
			runFilters();
		});

		document.querySelector("#character-select-none").addEventListener("click", () => {
			Object.keys(chars).forEach(char => {
				gameData["processedCharacters"][char].disabled = true;
				gameData["processedCharacters"][char].htmlElement.classList.add("character-card-disabled");
			});
			runFilters();
		});
	}

	Object.keys(batchFilters).forEach(filter => {
		const filterString = filter.replace("-filter", "");
		charKeys.forEach(char => {
			if (chars[char]) {
				let charData = filterString + "-" + gameData["processedCharacters"][char][filterString].toLowerCase().replace(" ", "-");
				if (gameData["processedCharacters"][char].name.includes("Traveler")) {
					if (filterString == "region" && !settings["traveler-region"]) {
						charData = "region-none";
					}
				}

				if (!(batchFilters[filter].includes(charData))) {
					chars[char] = false;
				}

				if (gameData["processedCharacters"][char].name == "Xiao" && filterString == "model" && batchFilters[filter].includes(charData.replace("medium", "short"))) {
					chars[char] = true;
				}
			}
		});
	});

	// patch filter
	charKeys.forEach(char => {
		if (chars[char]) {
			const patch = parseFloat(gameData["processedCharacters"][char].patch);
			let patchTargets = [parseFloat(document.querySelector("#patch-select-1").value), parseFloat(document.querySelector("#patch-select-2").value)];
			const patchRange = document.querySelector(`input[type='radio'][name='patch']:checked`).value;

			if (patchRange.includes("-before")) {
				if (patch > patchTargets[0]) {
					chars[char] = false;
				}
			} else if (patchRange.includes("-after")) {
				if (patch < patchTargets[0]) {
					chars[char] = false;
				}
			} else if (patchRange.includes("-between")) {
				if (patchTargets[0] > patchTargets[1]) {
					patchTargets = patchTargets.reverse();
				}
				if (patch < patchTargets[0] || patch > patchTargets[1]) {
					chars[char] = false;
				}
			}
		}
	});

	// date filter
	charKeys.forEach(char => {
		if (chars[char]) {
			const date = new Date(gameData["processedCharacters"][char].releasedate);
			let dateTargets = [new Date(document.querySelector("#release-date-select-1").value), new Date(document.querySelector("#release-date-select-2").value)];
			const dateRange = document.querySelector(`input[type='radio'][name='release-date']:checked`).value;

			if (dateRange.includes("-before")) {
				if (date > dateTargets[0]) {
					chars[char] = false;
				}
			} else if (dateRange.includes("-after")) {
				if (date < dateTargets[0]) {
					chars[char] = false;
				}
			} else if (dateRange.includes("-between")) {
				if (dateTargets[0] > dateTargets[1]) {
					dateTargets = dateTargets.reverse();
				}
				if (date < dateTargets[0] || date > dateTargets[1]) {
					chars[char] = false;
				}
			}
		}
	});

	const validSort = [], disabledButNotFiltered = [], disabledSort = [], filteredSort = [];
	Object.keys(chars).forEach(char => {
		if (chars[char]) {
			gameData["processedCharacters"][char].htmlTitleElement.classList.remove("character-card-title-filtered");
			gameData["processedCharacters"][char].htmlElement.classList.remove("character-card-filtered");

			if (gameData["processedCharacters"][char].disabled || gameData["processedCharacters"][char].forcedDisabled) {
				chars[char] = false;
				disabledButNotFiltered.push(char);
			} else {
				validSort.push(char);
			}
		} else {
			gameData["processedCharacters"][char].htmlTitleElement.classList.add("character-card-title-filtered");
			gameData["processedCharacters"][char].htmlElement.classList.add("character-card-filtered");
			if (!gameData["processedCharacters"][char].disabled && !gameData["processedCharacters"][char].forcedDisabled) {
				filteredSort.push(char);
			} else {
				disabledSort.push(char);
			}
		}
	});

	(validSort.concat(disabledButNotFiltered, disabledSort, filteredSort)).forEach(char => {
		gameData["processedCharacters"][char].htmlElement.parentElement.appendChild(gameData["processedCharacters"][char].htmlElement);
	});

	return chars;
}

function gatherSettings() {
	settings["traveler-region"] = document.querySelector("input[name='traveler-region']").checked;
	settings["traveler-multielement"] = document.querySelector("input[name='traveler-multielement']").checked;
	settings["traveler"] = document.querySelector("input[name='traveler']:checked").value;
	settings["number-of-teams"] = document.querySelector("input[name='number-of-teams']").value;
	settings["random-weapon-type"] = document.querySelector("input[name='random-weapon-type']:checked").value;
	settings["random-weapon-stars"] = [];
	document.querySelector("#random-weapon-stars").querySelectorAll("input[type='checkbox']:checked")
		.forEach(el => settings["random-weapon-stars"].push(el.value));
	settings["targets"] = [];
	document.querySelector("#target-selection").querySelectorAll("input[type='checkbox']:checked")
		.forEach(el => settings["targets"].push(el.name));
	settings["target-multiteam"] = document.querySelector("input[name='target-multiteam']").checked;
}

function toggleBetweenRadios() {
	["patch", "release-date"].forEach(target => {
		document.querySelectorAll(`input[type='radio'][name='${target}']`).forEach(radioBtn => {
			radioBtn.addEventListener("change", () => {
				if (document.querySelector(`input[type='radio'][name='${target}']:checked`).value === `${target}-between`) {
					document.querySelector(`#${target}-select-2-container`).classList.remove("hidden");
				} else {
					document.querySelector(`#${target}-select-2-container`).classList.add("hidden");
				}
			});

			if (document.querySelector(`input[type='radio'][name='${target}']:checked`).value === `${target}-between`) {
				document.querySelector(`#${target}-select-2-container`).classList.remove("hidden");
			} else {
				document.querySelector(`#${target}-select-2-container`).classList.add("hidden");
			}
		});
	});
}

function toggleEnableCheckboxes() {
	const containers = document.querySelectorAll(".en-btn");
	containers.forEach(element => {
		const 
			checkbox = element.querySelector("input[type='checkbox']"),
			text = element.querySelector("span");

		text.textContent = checkbox.checked ? "Enabled" : "Enable";
		checkbox.addEventListener("change", () => {
			text.textContent = checkbox.checked ? "Enabled" : "Enable";
		});
	});
}

function toggleTeamTypeButtons() {
	const 
		btns = document.querySelector("#team-type-selection-buttons").querySelectorAll("button"),
		textDisplays = document.querySelector("#team-type-selection-info").querySelectorAll("span");

	settings["team-type"] = "normal";

	for (let i = 0; i < btns.length; i++) {
		btns[i].addEventListener("click", () => {
			textDisplays.forEach(textDisplay => textDisplay.classList.add("removed"));
			btns.forEach(btn => {
				if (btns[i] === btn) {
					btn.classList.remove("secondary");
					textDisplays[i].classList.remove("removed");
					settings["team-type"] = btn.textContent.toLowerCase().replace(/[^a-z]+/g, '');
				} else {
					btn.classList.add("secondary");
				}
			});
		});
	}
}

function addPatchesToSelect(patches) {
	let patchOptionElementsTemplate = ``;
	patches.forEach(patch => {
		patchOptionElementsTemplate += `<option value="${patch}">${patch}</option>`;
	});
	document.querySelectorAll(".patch-select").forEach(selectElement => {
		selectElement.insertAdjacentHTML('beforeend', patchOptionElementsTemplate);
	});
	document.querySelector("#patch-select-1").querySelectorAll("option")[0].selected = true;
	document.querySelector("#patch-select-2").querySelectorAll("option")[patches.length - 1].selected = true;
}

function setStartDate(characters) {
	const dateInputs = document.querySelectorAll("input[type='date']");
	dateInputs[0].valueAsDate = new Date(
		Math.min(...characters.map(char => (new Date(char.releasedate)).getTime()))
	);
	dateInputs[1].valueAsDate = new Date();
}

function shortNameMap(name) {
	/*
		Manually adjusted mapping to shorten names.

		"Kuki Shinobu" and "Raiden Shogun" left as is, not sure of an accepted
		short name for them. "Ei" isn't technically correct, and both "Raiden"
		(reminds me of Revengeance) and "Shogun" sound wrong on their own.

		For the longest time I assumed Shinobu's first name was actually
		Kuki, i.e. written as "Shinobu Kuki", given how many people call her
		"Kuki" lol.

		Past Inazuma, they don't appear to push full names by default, so this
		shouldn't need to be modified often enough to warrant tracking.
	*/

	return {
		"Traveler (Lumine)": "Lumine",
		"Traveler (Aether)": "Aether",
		"Kaedehara Kazuha": "Kazuha",
		"Kamisato Ayaka": "Ayaka",
		"Shikanoin Heizou": "Heizou",
		"Kamisato Ayato": "Ayato",
		"Arataki Itto": "Itto",
		"Sangonomiya Kokomi": "Kokomi",
		"Kujou Sara": "Sara"
	}[name] || name;
}

function idstr(element, name, patch) {
	return (element + name + patch).toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function buildCharacterCards(data) {
	const cardContainer = document.querySelector(".character-card-container");
	const processed = {};
	data["characters"].reverse().forEach(character => {
		const element = character["element"],
			weapon = character["weapon"],
			// icon = "Null_Icon.png",
			icon = character["icon"],
			name = shortNameMap(character["name"]),
			star = character["rarity"],
			patch = character["patch"];
		const template = `
			<div class="character-card-icon-container">
				<img class="character-card-icon character-card-icon-element" src="assets/icons/${element}.png">
				<img class="character-card-icon character-card-icon-weapon" src="assets/icons/${weapon}.png">
			</div>
			<img class="character-card-profile-${star}" src="assets/icons/${icon}">
			<div class="character-card-title"><span class="character-card-title-text">&thinsp;${name}&thinsp;</span></div>
		`;
		const htmlElement = document.createElement("div");
		htmlElement.innerHTML = template;
		htmlElement.role = "button";
		htmlElement.classList.add("character-card");
		htmlElement.id = idstr(element, name, patch)
		cardContainer.appendChild(htmlElement);
		character.htmlElement = htmlElement;
		character.htmlTitleElement = htmlElement.querySelector(".character-card-title");
		character.disabled = false;

		character.htmlElement.addEventListener("click", () => {
			gameData["processedCharacters"][htmlElement.id].disabled = !gameData["processedCharacters"][htmlElement.id].disabled;
			if (gameData["processedCharacters"][htmlElement.id].disabled) {
				gameData["processedCharacters"][htmlElement.id].htmlElement.classList.add("character-card-disabled");
			} else {
				gameData["processedCharacters"][htmlElement.id].htmlElement.classList.remove("character-card-disabled");
			}
			runFilters();
		});

		processed[htmlElement.id] = character;
	});
	
	fitty(".character-card-title-text", {
		minSize: 10,
		maxSize: 16,
		multiLine: true
	});

	data["processedCharacters"] = processed;

	return data;
}

async function getData() {
	return await fetch(new Request("assets/data.json"))
		.then((response) => {
			return response.json();
		})
		.then((data) => {
			return buildCharacterCards(data);
		});
}
