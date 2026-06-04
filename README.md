# Generative lighting

This is an experiment around replacing image lighting in p5 with something that is lighter computationally and easier to code by hand for non-photoreal workflows.

A representation for this has to be both expressive, and also cheaply blurrable for different levels of roughness. Since this is intended for generative art, is is not essential that it perfectly sum the energy coming in from different angles; it just has to have that general look. The Phong lighting model in p5.js can cheaply be evaluated at different roughness levels, but isn't quite expressive enough to create scenes with. Image lighting is more expressive -- you can create an image and draw to it with whatever you want -- but all the convolutions required to make the different roughness levels are prohibitively expensive to animate environment lighting.

The solution I'm working with here is based on angular signed distance functions, creating 2D shapes that are mapped onto an infinitely large sphere around a subject.
