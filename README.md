# Generative lighting

This is an experiment around replacing image lighting in p5 with something that is lighter computationally and easier to code by hand for non-photoreal workflows.

A representation for this has to be both expressive, and also cheaply blurrable for different levels of roughness. Since this is intended for generative art, is is not essential that it perfectly sum the energy coming in from different angles; it just has to have that general look. The Phong lighting model in p5.js can cheaply be evaluated at different roughness levels, but isn't quite expressive enough to create scenes with. Image lighting is more expressive -- you can create an image and draw to it with whatever you want -- but all the convolutions required to make the different roughness levels are prohibitively expensive to animate environment lighting.

The solution I'm working with here is based on angular signed distance functions, creating 2D shapes that are mapped onto an infinitely large sphere around a subject.

## Angular SDFs

The angular SDFs here take in a surface normal and return two things:
- **distance**: the distance in radians to the edge of a shape
- **thickness**: the radius of the largest circle that can be inscribed within the shape

## Builder API

```js
myShader = buildEnvLightShader(() => {
  envColor.begin()
  const l = envLight(baseColor, envColor.dir, envColor.blur)
  l.mix(l.envCircle(...), lightColor)
  envColor.set(l.get())
  envColor.end()
})
```

`envLight(baseColor, dir, blur)` creates a builder. `dir` and `blur` are captured once and used by all subsequent method calls.

**Shape methods** (return an SDF result to pass to `mix`):
- `l.envCircle(center, radius)` - spherical cap; `center` is a unit vec3, `radius` in radians
- `l.envCapsule(a, b, radius)` - capsule between two unit vec3 endpoints, `radius` in radians
- `l.envStar(center, n, innerRadius, outerRadius, rotation?)` - n-pointed star; radii in radians, `n` is a plain JS integer
- `l.envRect(center, size, rotation?)` - rectangle; `size` is `[halfWidth, halfHeight]` as chord lengths (sine of angle, not radians), `rotation` in radians
- `l.envWindow(center, size, panes, barWidth)` - rectangle subdivided into panes; `panes` is `[nx, ny]`; `size` and `barWidth` are chord lengths (sine of angle, not radians — for small shapes the difference is negligible)

**Color methods** (return a scalar/vec usable in `mix`):
- `l.envNoise(size)` - blur-aware fractal noise value; `size` is the angular scale of the largest octave
- `l.envNoisePlane(planeNormal, h, size, rotation?)` - projects a planar noise field onto the sphere; `h` is the plane's height, `size` is the noise scale

**Builder methods**:
- `l.mix(shape, color)` - blends `color` into the accumulated result using the shape's SDF; returns `l` for chaining
- `l.get()` - returns the final accumulated color
