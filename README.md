## sight-for-sore-ears
Audio visualizer

A cool audio visualizer that works without any downloads or uploads.

## Features
Zero Config required - Runs entirely in the browser on desktop (Chrome and edge)


Different modes - 4 different visualizer themes
                  i) Spectrum Bars
                  ii)Radial
                  iii)oscilloscope
                  iv)Neon City

                  
Different themes- 4 Different themes
                  i) Neon
                  ii) Synthwave
                  iii) Matrix
                  iv) Ember

Standby Mode: When no audio is playing, it uses a mathematical sine wave to keep the screen moving

Persistent Settings: Stores preferences in localstorage

## How it Works

1. Capture: Clicking "Capture Audio" utilizes navigator.mediaDevices.getDisplayMedia() to capture a browser tab or screen with audio enabled.
2. Analysis: Audio data oasses into Web Audio API's AnalyserNode (FFT1024). Frequency bins are grouped into 64 log-spaced bands so the bass receives a balanced distribution on screen rather than dominating the whole view.
3. Rendering: A 2D canvas requestAnimationFrame loop paints semi-transparent layers to generate motion blur and other cool visual effects.






