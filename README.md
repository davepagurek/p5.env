# p5.env: Generative lighting for p5.strands

This is an experiment around replacing image lighting in p5 with something that is lighter computationally and easier to code by hand for non-photoreal workflows.

<img width="1042" height="667" alt="Screenshot 2026-06-19 at 8 36 07 AM" src="https://github.com/user-attachments/assets/62a5a12c-e9a2-4c19-b91c-9c7e1d2ac07d" />

## Adding the library

Add it via a script tag:

```html
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/p5.env@0.0.4/p5.env.js"></script>
```

Or for OpenProcessing, you can add it directly via CDN:

```
https://cdn.jsdelivr.net/npm/p5.env@0.0.4/p5.env.js
```

## Builder API

```js
myShader = buildEnvMaterial(() => {
  envColor.begin()
  const l = envLight(baseColor, envColor.dir, envColor.blur)
  l.mix(l.circle(...), lightColor)
  envColor.set(l.get())
  envColor.end()
})
```

`envLight(baseColor, dir, blur)` creates a builder. `dir` and `blur` are captured once and used by all subsequent method calls.

**Shape methods** (return an SDF result to pass to `mix`):
- `l.circle(center, radius)` - spherical cap; `center` is a unit vec3, `radius` in radians
- `l.capsule(a, b, radius)` - capsule between two unit vec3 endpoints, `radius` in radians
- `l.star(center, n, innerRadius, outerRadius, rotation?)` - n-pointed star; radii in radians, `n` is a plain JS integer
- `l.rect(center, size, rotation?)` - rectangle; `size` is `[halfWidth, halfHeight]` as chord lengths (sine of angle, not radians), `rotation` in radians
- `l.window(center, size, panes, barWidth)` - rectangle subdivided into panes; `panes` is `[nx, ny]`; `size` and `barWidth` are chord lengths (sine of angle, not radians -- for small shapes the difference is negligible)

**Color methods** (return a scalar/vec3 usable in expressions or as a base color):
- `l.gradient(center, ...stops)` - radial gradient; each stop is `{ t, color }` where `t` is angle from `center` in radians and `color` is a vec3; spread stops as individual arguments
- `l.noise(size)` - blur-aware fractal noise value; `size` is the angular scale of the largest octave
- `l.noisePlane(planeNormal, h, size, { rotation?, offset? })` - projects a planar noise field onto the sphere; `h` is the plane's height, `size` is the noise scale; `offset` is a vec2 that shifts the noise coordinate (use for animation)

**Builder methods**:
- `l.mix(shape, color)` - blends `color` into the accumulated result using the shape's SDF; returns `l` for chaining
- `l.get()` - returns the final accumulated color

## Panorama

The same `envColor` hook can also drive a background panorama, so the environment visible on surfaces matches the environment visible in the background.

```js
const envHooks = () => {
  envColor.begin()
  // ... same hook body as before ...
  envColor.end()
}

let envShader, pano

function setup() {
  envShader = buildEnvMaterial(envHooks)
  pano = buildEnvPanorama(envHooks)
}

function draw() {
  pano()
  shader(envShader)
  sphere(150)
}
```

`buildEnvPanorama` returns a function. Calling it each frame sets the camera uniforms and applies the panorama as a post-process filter. Pass a blur value in radians to match a rough material's specular blur: `pano(blur)`.

## How does it work?

A representation for lighting has to be both expressive, and also cheaply blurrable for different levels of roughness. Since this is intended for generative art, is is not essential that it perfectly sum the energy coming in from different angles; it just has to have that general look. The Phong lighting model in p5.js can cheaply be evaluated at different roughness levels, but isn't quite expressive enough to create scenes with. Image lighting is more expressive -- you can create an image and draw to it with whatever you want -- but all the convolutions required to make the different roughness levels are prohibitively expensive to animate environment lighting.

The solution I'm working with here is based on angular signed distance functions, creating 2D shapes that are mapped onto an infinitely large sphere around a subject.

The angular SDFs here take in a surface normal and return two things:
- **distance**: the distance in radians to the edge of a shape
- **thickness**: the radius of the largest circle that can be inscribed within the shape
