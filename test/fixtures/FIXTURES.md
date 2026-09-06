# Face-detection test fixtures

All photos come from Wikimedia Commons and were verified via the Commons API (`prop=imageinfo&iiprop=extmetadata`) to carry `LicenseShortName = CC0` before download. They are Unsplash-era CC0 uploads (real photographs, phone/DSLR quality). Files were fetched through the Commons thumbnailer at a 1800-2000 px request width; the sizes below are the actual pixel dimensions of the saved files.

Face counts were made by eye at full resolution: a face is counted when a human would say "there is a face here" (at least eyes/nose region visible). Backs of heads, foreheads-only and cut-off edge figures are not counted and are called out in the notes.

| File | Commons page | Author | License | Size (px) | Faces | Pose / notes |
|---|---|---|---|---|---|---|
| `frontal.jpg` | [Gray-haired man portrait (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Gray-haired_man_portrait_(Unsplash).jpg) | Foto Sushi (Unsplash @fotosushi) | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | 3840x2560 (orig 5760x3840) | 1 | Frontal portrait, slight turn (~10 deg), eyeglasses, plain studio background. Sanity check. |
| `profile-90.jpg` | [Beard and Beanie (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Beard_and_Beanie_(Unsplash).jpg) | Allef Vinicius (Unsplash @seteales) | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | 3840x2560 (orig 5184x3456) | 1 | Strict side profile (~90 deg) facing right, beard, beanie covering hair/forehead, indoor low-contrast light. |
| `three-quarter.jpg` | [Brunette woman portrait (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg) | Christopher Campbell (Unsplash @chrisjoelcampbell) | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | 3840x2560 (orig 5184x3456) | 1 | Three-quarter view (~45 deg) turned to the viewer's right, slight head tilt, long hair partially covering one cheek. |
| `tilted-head.jpg` | [Woman lying in autumn leaves (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Woman_lying_in_autumn_leaves_(Unsplash).jpg) | Neal Kharawala (Unsplash @nealk) | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | 3840x2560 (orig 5184x3456) | 1 | Lying down, head rolled ~80-90 deg (face nearly horizontal), close-up, shallow depth of field, leaves partially over chin. |
| `occluded.jpg` | [Hiding Behind Leaves (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Hiding_Behind_Leaves_(Unsplash).jpg) | Allef Vinicius (Unsplash @seteales) | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | 3840x2560 (orig 5184x3456) | 1 | Frontal close-up with strong partial occlusion: leaves cover the left eye, nose and part of the mouth; only right eye and lips clearly visible. |
| `group-small-faces.jpg` | [Happy young people near fire (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Happy_young_people_near_fire_(Unsplash).jpg) | Phil Coffman (Unsplash @philcoffman) | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | 3840x2560 (orig 4450x2967) | 8 | Campfire group, 8 clearly visible faces of varying size: 2 strict profiles (left), 1 in sunglasses, several three-quarter, 1 small face at right partly covered by a hand. NOT counted: foreground man in grey cap seen from behind (only sunglasses edge), a person behind him showing only forehead/hair, and a cut-off hat at the far-left edge. |
| `crowd-many-faces.jpg` | [Cheering concertgoers (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Cheering_concertgoers_(Unsplash).jpg) | Ezra Jeffrey (Unsplash @emcomeau) | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | 3840x2560 (orig 3957x2638) | 18 | Dense concert crowd, low light. 18 clearly visible faces (sizes from ~600 px to ~80 px), many partially occluded by raised arms/hands; several profiles. Roughly 10 further blurred/tiny background heads are ambiguous - treat the count as a minimum (>=18), not an exact match. |
| `no-faces.jpg` | [Matterhorn sunset 2016 (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Matterhorn_sunset_2016_(Unsplash).jpg) | Sam Ferrara (Unsplash @samferrara) | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | 1920x1280 (orig 3840x2560) | 0 | Negative case: Matterhorn at sunset, no people at all. |

## Coverage

1. Strict side profile (90 deg): `profile-90.jpg`
2. Three-quarter view: `three-quarter.jpg`
3. Tilted / rolled head: `tilted-head.jpg`
4. Group with 5+ faces of varying sizes: `group-small-faces.jpg` (8 faces), `crowd-many-faces.jpg` (18+ faces, small ones)
5. Partial occlusion: `occluded.jpg` (leaves); also sunglasses/hand occlusions inside the group and crowd shots
6. Frontal sanity check: `frontal.jpg`
7. Negative (no faces): `no-faces.jpg`

`expected.json` holds the same counts in machine-readable form. For `crowd-many-faces.jpg` the value is a floor: assert `detected >= 18` (and reasonably `<= 30`) rather than equality.
