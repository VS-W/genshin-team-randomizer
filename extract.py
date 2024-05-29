import datetime, json, os, time

from bs4 import BeautifulSoup as bs
import requests

def fetch(url, target, img=False, write_html=False):
	if os.path.exists(target):
		print("Target exists, skipping download...")
		return

	response = requests.get(url, headers={
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
	})

	time.sleep(0.5)

	if response.status_code == 200:
		if img:
			print("Writing to " + target)
			with open(target, "wb") as f:
				f.write(response.content)

		print("Download success.")
		return response.text
	else:
		print(f"Download failed.")
		return False

output_dir = "assets/"
existing_icons = []
if os.path.exists(output_dir + "icons"):
	existing_icons = os.listdir(output_dir + "icons")
else:
    os.makedirs(output_dir + "icons")

character_list_url = "https://genshin-impact.fandom.com/wiki/Character/List"
target_file = datetime.datetime.now().strftime("%Y%m%d") + ".html"

html = fetch(character_list_url, output_dir + target_file)

if not html:
	print("No data, exiting...")
	exit()

article_table = bs(html, features="html.parser").find(class_="article-table")
character_data = []
img_data = {}
for row in article_table.find_all("tr"):
	cells = row.find_all(["td"])
	data = []
	for cell in cells:
		cell_text = cell.get_text(strip=True)
		if len(cell_text):
			data.append(cell_text)
			img = cell.find("img")
			if img:
				src = img.get("data-src") or img.get("src")
				icon_src = src.split("/revision")[0]
				icon_file = cell_text + "." + icon_src.split(".")[-1]
				img_data[icon_file] = icon_src
		else:
			img = cell.find("img")
			title = img.get("title")
			if title and "Stars" in title:
				cell_text = title.strip().split(" ")[0]
				data.append(title.strip().split(" ")[0])
				src = img.get("data-src") or img.get("src")
				icon_src = src.split("/revision")[0]
				icon_file = icon_src.split("/")[-1:][0]
				if "Icon_" in icon_file:
					icon_file = icon_file.replace("Icon_", "").replace("_Stars", "")
			else:
				src = img.get("data-src") or img.get("src")
				if src and "_Icon" in src:
					icon_src = src.split("/revision")[0]
					icon_file = icon_src.split("/")[-1:][0]
					img_data[icon_file] = icon_src
					data.append(icon_file)
				else:
					print("Error finding character icon: ", img)
					data.append("No image found.")
	if len(data):
		character_data.append(data)

mapping = ["icon", "name", "rarity", "element", "weapon", "region", "model", "releasedate", "patch"]

# At the time of writing, region "Natlan" has no characters, and the "Short Male" mode type doesn't exist as playable character.
# Adding them by default for posterity.
output = {
	"characters": [],
	"region": ["Natlan"],
	"element": [],
	"weapon": [],
	"model": ["Short Male"],
	"patch": []
}

for char in character_data:
	mapped = dict(zip(mapping, char))
	if not mapped["name"] == "Traveler":
		output["characters"].append(mapped)
		for key in mapped.keys():
			if key in output and not mapped[key] in output[key]:
				output[key].append(mapped[key])

traveler = {
	"base": {
		"rarity": "5",
		"weapon": "Sword",
	},
	"model": [
		{
			"name": "Traveler (Aether)",
			"icon": "Aether_Icon.png",
			"model": "Medium Male"
		},
		{
			"name": "Traveler (Lumine)",
			"icon": "Lumine_Icon.png",
			"model": "Medium Female"
		}
	],
	"element": [
		{
			"element": "Hydro",
			"patch": "4.0",
			"releasedate": "August 16, 2023",
			"region": "Fontaine"
		},
		{
			"element": "Dendro",
			"patch": "3.0",
			"releasedate": "August 24, 2022",
			"region": "Sumeru"
		},
		{
			"element": "Electro",
			"patch": "2.0",
			"releasedate": "July 21, 2021",
			"region": "Inazuma"
		},
		{
			"element": "Geo",
			"patch": "1.0",
			"releasedate": "September 28, 2020",
			"region": "Liyue"
		},
		{
			"element": "Anemo",
			"patch": "1.0",
			"releasedate": "September 28, 2020",
			"region": "Mondstadt"
		}
	]
}

for element in traveler["element"]:
	for model in traveler["model"]:
		merged = dict(traveler["base"] | element | model)
		output["characters"].append(merged)
		for key in merged.keys():
			if key in output and not merged[key] in output[key]:
				output[key].append(merged[key])

traveler_icons = ["Lumine_Icon.png", "Aether_Icon.png"]
for icon in traveler_icons:
	if not icon in existing_icons:
		print("Fetch: " + icon)
		imgs = bs(fetch("https://genshin-impact.fandom.com/wiki/Traveler/Gallery", output_dir + "traveler_icons.html"), features="html.parser").find_all("img")
		for img in imgs:
			src = img.get("data-src")
			if src and icon in src:
				icon_src = src.split("/revision")[0]
				icon_file = icon_src.split("/")[-1:][0]
				fetch(icon_src, output_dir + "icons/" + icon, img=True)

star_icons = ["Icon_1_Star.png", "Icon_2_Stars.png", "Icon_3_Stars.png", "Icon_4_Stars.png", "Icon_5_Stars.png"]
for icon in star_icons:
	if not icon in existing_icons:
		print("Fetch: " + icon)
		imgs = bs(fetch("https://genshin-impact.fandom.com/wiki/Category:Quality_Icons", output_dir + "star_icons.html"), features="html.parser").find_all("img")
		for img in imgs:
			src = img.get("data-src")
			if src and icon in src:
				icon_src = src.split("/revision")[0]
				icon_file = icon_src.split("/")[-1:][0]
				fetch(icon_src, output_dir + "icons/" + icon, img=True)

for icon in img_data.keys():
	if not icon in existing_icons:
		print("Fetch: " + icon)
		fetch(img_data[icon], output_dir + "icons/" + icon, img=True)

output["characters"] = sorted(output["characters"], key=lambda x: datetime.datetime.strptime(x["releasedate"], "%B %d, %Y"))
output["patch"] = sorted(output["patch"])

with open(output_dir + "data.json", "w", encoding="utf-8") as f:
	f.write(json.dumps(output, indent=4))

# print(json.dumps(output, indent=4))
