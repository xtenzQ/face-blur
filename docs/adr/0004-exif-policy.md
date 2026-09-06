---
status: accepted
---
# Keep EXIF by default, but rebuild the thumbnail and orientation

A privacy tool is expected to strip metadata. We deliberately keep EXIF by default (capture date, camera, GPS) because the user is hiding faces, not anonymising the file; stripping metadata is a separate "Strip metadata" checkbox, off by default.

When EXIF is kept, two fields cannot be copied as-is:

- **Thumbnail (IFD1)**: the source carries an unmasked thumbnail. We generate a new one from the final masked image (about 160 px on the long side) and write it in place of the old one.
- **Orientation**: the rotation has already been applied to the pixels, so the tag is reset to 1.

Canvas export does not preserve EXIF, so the APP1 segment is rebuilt and inserted into the output JPEG by the app (piexifjs). Metadata is only carried over for JPEG input; PNG/WebP rarely carry EXIF and HEIC is re-encoded to JPEG without it.
