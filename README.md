# Fire Evacuation Plan Editor (MVP)

A simple browser-based editor to place and edit walls, exits, and evacuation arrows.

## Features

- Upload your architect plan image as a background.
- Add wall segments, door symbols, exit symbols, and evacuation arrows.
- Select a wall and edit:
  - thickness (cm)
  - length (cm)
  - orientation (degrees)
- Drag walls to move them.
- Drag walls to move them with wall-to-wall snapping for easier placement.
- Drag endpoint handle to resize and rotate quickly.
- While resizing, wall orientation snaps to angle increments and nearby wall orientations.
- While resizing, wall endpoints snap to nearby wall edges/endpoints to help close room boundaries.
- Snap indicators highlight the exact target edge/corner and show snap mode text.
- Duplicate selected item from button, or copy/paste with `Ctrl+C` and `Ctrl+V` (`Cmd` on macOS).
- Door symbols sit above walls and snap to nearby walls while dragging.
- Measurement tool: click two points on the canvas to display distance in cm.
- Export/import project as JSON.
- Export a print-ready A3 PNG image (not PDF) for printing.

## Run

Because this app uses file uploads, run it through a local server (recommended):

### Option 1 (Python)

```bash
python -m http.server 5500
```

Then open: `http://localhost:5500`

### Option 2 (VS Code Live Server extension)

Open `index.html` and choose **Open with Live Server**.
