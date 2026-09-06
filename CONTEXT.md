# Face Blur

A browser application that hides faces (and other areas) in photographs before they are shared. Everything happens on the user's device.

## Language

**Photo**:
One loaded image together with its Regions and Metadata. The unit of work; several Photos form a Batch.
_Avoid_: image, picture, file

**Batch**:
The set of Photos loaded together and processed with shared settings.
_Avoid_: session, album, queue

**Region**:
An area of a Photo that will be hidden on Export. Has a source: `detected` (proposed by the face detector) or `manual` (drawn by the user). The user always has the final word: a Region can be enabled, disabled, moved, resized or reshaped.
_Avoid_: face, box, bbox, selection

**Detection**:
A face candidate produced by the detector, with a confidence score. Becomes a Region with source `detected`. A Detection below the confirmation threshold becomes a disabled Region shown as a suggestion.
_Avoid_: prediction, result, hit

**Mask**:
The way a Region's content is hidden: pixelate or blur. Mask settings are global for the Batch, never per Region.
_Avoid_: filter, effect, censor

**Metadata**:
The EXIF data of the source Photo (capture date, camera, GPS, orientation, embedded thumbnail) carried into the Export. Kept by default; the thumbnail and orientation in the result always match the masked image.
_Avoid_: EXIF (as a UI term), tags, info

**Export**:
Producing the final file with all enabled Masks applied. The source pixels never leave the device.
_Avoid_: save, download, render
