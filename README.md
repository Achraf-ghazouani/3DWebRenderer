# Three.js Avatar Viewer

A simple Three.js project for viewing GLB avatar models.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npx vite 
```

3. Open your browser and navigate to the URL shown in the terminal (usually http://localhost:5173)

## Loading Your Avatar

To load your GLB avatar, you can use the browser's console:

```javascript
loadModel('path/to/your/avatar.glb')
```

Replace 'path/to/your/avatar.glb' with the actual path to your GLB file.

## Features

- Orbit controls for camera movement
- Proper lighting setup
- Shadow support
- Responsive design
- Automatic window resize handling

## Controls

- Left click + drag: Rotate camera
- Right click + drag: Pan camera
- Scroll: Zoom in/out 