let settings = {};
let gameData = false;

getData().then((res) => {
	gameData = res;

	addPatchesToSelect(gameData["patch"]);
	setStartDate(gameData["characters"]);

	runFilters(true);
});

fitty("#team-type-selection-buttons button span", {
	minSize: 14,
	maxSize: 22,
	multiLine: true
});

toggleTeamTypeButtons();
toggleEnableCheckboxes();
toggleBetweenRadios();

gatherSettings();

function runFilters(initialize = false) {
	gatherSettings();

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
				if (gameData["processedCharacters"][char].name.includes("Traveler") && filterString == "region") {
					if (!settings["traveler-region"]) {
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
			// console.log(gameData["processedCharacters"][char].name, patch, patchRange, patchTargets, chars[char]);
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
			// console.log(gameData["processedCharacters"][char].name, date, dateRange, dateTargets, chars[char]);
		}
	});

	const validSort = [], disabledButNotFiltered = [], disabledSort = [], filteredSort = [];
	Object.keys(chars).forEach(char => {
		if (chars[char]) {
			gameData["processedCharacters"][char].htmlTitleElement.classList.remove("character-card-title-filtered");
			gameData["processedCharacters"][char].htmlElement.classList.remove("character-card-filtered");

			if (gameData["processedCharacters"][char].disabled) {
				chars[char] = false;
				disabledButNotFiltered.push(char);
			} else {
				validSort.push(char);
			}
		} else {
			gameData["processedCharacters"][char].htmlTitleElement.classList.add("character-card-title-filtered");
			gameData["processedCharacters"][char].htmlElement.classList.add("character-card-filtered");
			if (!gameData["processedCharacters"][char].disabled) {
				filteredSort.push(char);
			} else {
				disabledSort.push(char);
			}
		}
	});

	(validSort.concat(disabledButNotFiltered, disabledSort, filteredSort)).forEach(char => {
		gameData["processedCharacters"][char].htmlElement.parentElement.appendChild(gameData["processedCharacters"][char].htmlElement);
	});
}

function gatherSettings() {
	settings["traveler-region"] = document.querySelector("input[name='traveler-region']").checked;
	settings["traveler-multielement"] = document.querySelector("input[name='traveler-multielement']").checked;
	settings["traveler"] = document.querySelector("input[name='traveler']:checked").value;
	settings["number-of-teams"] = document.querySelector("input[name='number-of-teams']").value;
	settings["random-weapon-type"] = document.querySelector("input[name='random-weapon-type']:checked").value;
	settings["random-weapon-stars"] = [];
	document.querySelector("#random-weapon-stars").querySelectorAll("input[type='checkbox']:checked").forEach(el => settings["random-weapon-stars"].push(el.value));
	settings["targets"] = [];
	document.querySelector("#target-selection").querySelectorAll("input[type='checkbox']:checked").forEach(el => settings["targets"].push(el.name));
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
		patchOptionElementsTemplate += `<option ${patchOptionElementsTemplate.length ? "" : "selected "}value="${patch}">${patch}</option>`;
	});
	document.querySelectorAll(".patch-select").forEach(selectElement => {
		selectElement.insertAdjacentHTML('beforeend', patchOptionElementsTemplate);
	});
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
			icon = "Null_Icon.png",
			// icon = character["icon"],
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
