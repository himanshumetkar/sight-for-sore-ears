Sight For Sore Ears is a audio visualizer that runs natively in the browser without any backend or any special API keys.

#How it works
-> Capture: when you click "Capture Audio" the program calls navigator.mediaDevices.getDisplayMedia() with audio enabled. You a pick a tab and share audio.
-> Analysis: The audio goes into a web audio Analyser.Node (FFT size 1024). On the every fram, the program reads the frequence and the waveform. The 512 frequency bins are grouped into 64 log based spaced bands so bass gets a fair share of the screen and not the whole screen. This splits the bands into bass, mid and treb
->Beat Detection: The program tracks a rolling avg of bass energy. Whent the bass jumps well above the avg, it counts as a beat and triggers a screen shake and a glitch effect. To avoid the program from cluttering the screen, i added a 200 ms cooldown.
->Drawing: a requestAnimationFrame loop draws to a 2D canvas. Each frame paints a semi-transparent layer over the last on, which create some motion blur. THe drawing functions are handled by Bars, radial, scope and city
->Themes and State: Theme colours are set as CSS variables on the page and also used by the canvas. a --pulse variable tied to the bass controls the glow of the header. The chosen mode and theme are saved in localStorage so they persist between visits.
->Standby mode: When nothing is being caputured the app generates a synthetic sin wave signal so the screen still moves.



Sight for sore ears is a browser based audio visualizer. Share a tab's audio and watch it become spectrum bars, radial rings, and oscillosope or a neon city that moves with the beat. It needs no install, no backend and no API keys. Works best on desktop on chrome or edge