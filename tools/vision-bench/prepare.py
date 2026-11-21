"""Builds the test manifest and a resized image cache.

Usage: python3 prepare.py <data_dir> <cache_dir>
<data_dir> holds the three unzipped datasets (see README). The sample is stratified and seeded, chosen before
any model is run, and never changed afterwards. Images are resized to at most 512 px (JPEG q85) once, and every
model sees the same file.
"""
import json, os, random, sys
from PIL import Image

data, cache = sys.argv[1], sys.argv[2]
os.makedirs(cache, exist_ok=True)
rng = random.Random(20261121)

# dataset folder -> (class folder -> RecycleIQ material)
SOURCES = {
    "garbage12": ("g12/garbage_classification", 200, {
        "plastic": "plastic", "paper": "paper", "cardboard": "cardboard", "metal": "metal",
        "brown-glass": "glass", "green-glass": "glass", "white-glass": "glass",
        "biological": "food", "battery": "battery", "clothes": "textile", "shoes": "textile", "trash": "general"}),
    "trashnet": ("trashnet/dataset-resized", 120, {
        "plastic": "plastic", "paper": "paper", "cardboard": "cardboard", "metal": "metal", "glass": "glass", "trash": "general"}),
    "complex": ("complex/complex_dataset", 1000, {
        "battery": "battery", "clothes": "textile", "glass": "glass", "paper": "paper", "shoes": "textile"}),
}
items = []
for ds, (root, per_class, mapping) in SOURCES.items():
    for folder, label in mapping.items():
        d = os.path.join(data, root, folder)
        files = sorted(f for f in os.listdir(d) if f.lower().endswith((".jpg", ".jpeg", ".png")))
        for f in rng.sample(files, min(per_class, len(files))):
            iid = f"{ds}/{folder}/{os.path.splitext(f)[0]}"
            out = os.path.join(cache, iid.replace("/", "__") + ".jpg")
            if not os.path.exists(out):
                im = Image.open(os.path.join(d, f)).convert("RGB")
                im.thumbnail((512, 512))
                im.save(out, "JPEG", quality=85)
            items.append({"id": iid, "dataset": ds, "source": f"{root}/{folder}/{f}", "label": label})
json.dump({"seed": 20261121, "items": items}, open("manifest.json", "w"), indent=0)
from collections import Counter
print(len(items), Counter((i["dataset"], i["label"]) for i in items))
