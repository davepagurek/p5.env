function envLight(p5, fn) {
  fn.baseEnvLightShader = function() {
    if (!this._baseEnvLightShader) {
      this._baseEnvLightShader = new p5.Shader(
        this.baseMaterialShader()._renderer,
        this.baseMaterialShader()._vertSrc,
        this.baseMaterialShader()._fragSrc,
        {
          declarations: 'vec3 n; vec3 r;',
          vertex: {
            ...this.baseMaterialShader().hooks.vertex,
          },
          fragment: {
            'vec3 envColor': `(vec3 dir, float blur) { return vec3(0.); }`,
            ...this.baseMaterialShader().hooks.fragment,
            'Inputs getPixelInputs': `(Inputs inputs) {
              n = inputs.normal * uCameraNormalMatrix;
              vec3 lightDir = normalize(vViewPosition);
              r = reflect(lightDir, inputs.normal) * uCameraNormalMatrix;
              return inputs;
            }`,
            'vec4 combineColors': `(ColorComponents components) {
              components.diffuse = HOOK_envColor(n, ${PI/2});
              components.specular = HOOK_envColor(r, ${PI/2}/(1. + 0.25 * uShininess));
              // components.specular = pow(HOOK_envColor(r, ${PI/2}/(1. + 0.25 * uShininess)), vec3(10.));
              // return vec4(components.specular, 1.);
              vec4 color = vec4(0.);
              color.rgb += components.diffuse * components.baseColor;
              color.rgb += components.ambient * components.ambientColor;
              color.rgb += components.specular * components.specularColor;
              color.rgb += components.emissive;
              // color.rgb = reinhard2(color.rgb);
              color.a = components.opacity;
              return color;
            }`,
          },
          helpers: {
            'vec3 reinhard2': `(vec3 x) {
              const float L_white = 1.1;
              return (x * (1.0 + x / (L_white * L_white))) / (1.0 + x);
            }`,
          },
        }
      )
    }
    return this._baseEnvLightShader
  }

  fn.buildEnvLightShader = function(...args) {
    return this.baseEnvLightShader().modify(...args)
  }

  // Shape helpers

  fn.envCircle = function(dir, center, radius) {
    dir = p5.strandsNode(dir)
    center = p5.strandsNode(center)
    radius = p5.strandsNode(radius)

    return {
      distance: this.acos(this.dot(dir, center)).sub(radius),
      thickness: radius,
    }
  }

  fn.envCapsule = function(dir, a, b, radius) {
    dir = p5.strandsNode(dir)
    a = p5.strandsNode(a)
    b = p5.strandsNode(b)
    radius = p5.strandsNode(radius)

    let ba = b.sub(a)
    let h = this.clamp(this.dot(dir.sub(a), ba).div(this.dot(ba, ba)), 0, 1)
    let closest = this.normalize(a.add(ba.mult(h)))
    return {
      distance: this.acos(this.dot(dir, closest)).sub(radius),
      thickness: radius,
    }
  }

  fn.envNoise = function(dir, size, blur, offset = [0, 0]) {
    // Adjust if p5's noise output is not centered exactly here
    const noiseMean = 0.5

    dir = p5.strandsNode(dir)
    size = p5.strandsNode(size)
    blur = p5.strandsNode(blur).mult(2)
    offset = p5.strandsNode(offset)

    // Single-octave raw noise so we can stack octaves ourselves
    this.noiseDetail(1, 0.5)

    // Adding offset before dividing by size means all octaves drift at the
    // same world-space rate (higher-frequency octaves get a proportionally
    // larger offset in their normalized coordinate space).
    let p = dir.add(offset).div(size)
    let blurRatio = blur.div(size)

    // Each octave fades out when blur exceeds that octave's angular size
    let f1 = this.max(0, p5.strandsNode(1).sub(blurRatio))
    let f2 = this.max(0, p5.strandsNode(1).sub(blurRatio.mult(2)))
    let f3 = this.max(0, p5.strandsNode(1).sub(blurRatio.mult(4)))
    let f4 = this.max(0, p5.strandsNode(1).sub(blurRatio.mult(8)))

    // Subtract the mean before weighting so blur only attenuates variation,
    // not the average. Add the mean back once at the end.
    return p5.strandsNode(noiseMean)
      .add(f1.mult(this.noise(p).sub(noiseMean)))
      .add(f2.mult(this.noise(p.mult(2)).sub(noiseMean)).mult(0.5))
      .add(f3.mult(this.noise(p.mult(4)).sub(noiseMean)).mult(0.25))
      .add(f4.mult(this.noise(p.mult(8)).sub(noiseMean)).mult(0.125))
  }

  fn.envNoisePlane = function(dir, planeNormal, h, size, blur, { rotation = 0, offset = [0, 0] } = {}) {
    dir = p5.strandsNode(dir)
    planeNormal = p5.strandsNode(planeNormal)
    rotation = p5.strandsNode(rotation)
    h = p5.strandsNode(h)

    let up = this.abs(planeNormal.y) < 0.99
      ? this.vec3(0, 1, 0)
      : this.vec3(1, 0, 0)
    let xLocal = this.normalize(this.cross(up, planeNormal))
    let yLocal = this.cross(planeNormal, xLocal)

    let pn = this.dot(dir, planeNormal)
    let px = this.dot(dir, xLocal)
    let py = this.dot(dir, yLocal)

    // Rotate in chord space, then perspective-project onto the plane (x/n).
    let cosR = this.cos(rotation)
    let sinR = this.sin(rotation)
    let rpx = cosR.mult(px).add(sinR.mult(py))
    let rpy = cosR.mult(py).sub(sinR.mult(px))
    let invPn = h.div(pn.add(0.001))
    let coord = this.vec2(rpx.mult(invPn), rpy.mult(invPn))

    // let blurScale = h.div(this.pow(pn, 2).add(0.001))
    // let blurScale = h.div(this.abs(pn).add(0.001))
    let blurScale = h.div(this.pow(this.abs(pn), 1.5).add(0.001))
    return this.mix(
      0.5,
      this.envNoise(coord.add(1000), size, blur.mult(blurScale), offset),
      this.abs(pn) // Hack for smoother transition
    )
  }

  fn.envStar = function(dir, center, n, innerRadius, outerRadius, rotation = 0) {
    dir = p5.strandsNode(dir)
    center = p5.strandsNode(center)
    innerRadius = p5.strandsNode(innerRadius)
    outerRadius = p5.strandsNode(outerRadius)
    rotation = p5.strandsNode(rotation)

    let up = this.abs(center.y) < 0.99
      ? this.vec3(0, 1, 0)
      : this.vec3(1, 0, 0)
    let xLocal = this.normalize(this.cross(up, center))
    let yLocal = this.cross(center, xLocal)

    const an = Math.PI / n

    // True angular distance from center -- same units as innerRadius/outerRadius
    let r = this.acos(this.clamp(this.dot(dir, center), -1, 1))

    // Azimuthal angle via a single atan on raw dot products.
    // The atan discontinuity at +-PI is harmless: mod(PI, 2an) == mod(-PI, 2an)
    let a = this.mod(
      this.atan(this.dot(dir, yLocal), this.dot(dir, xLocal)).sub(rotation),
      2 * an
    )
    let aFolded = this.min(a, p5.strandsNode(2 * an).sub(a))
    let q = r.mult(this.vec2(this.cos(aFolded), this.sin(aFolded)))

    // Edge from outer tip to inner valley
    let tip = this.vec2(outerRadius, 0)
    let valley = this.vec2(innerRadius.mult(Math.cos(an)), innerRadius.mult(Math.sin(an)))
    let edge = valley.sub(tip)

    // Signed distance: negative inside the star
    let h = this.clamp(this.dot(q.sub(tip), edge).div(this.dot(edge, edge)), 0, 1)
    let d = this.length(q.sub(tip.add(edge.mult(h))))
    let cross2D = edge.x.mult(q.y).sub(edge.y.mult(q.x.sub(outerRadius)))
    d = d.mult(this.sign(cross2D.mult(-1)))

    return {
      distance: d,
      thickness: innerRadius,
    }
  }

  fn.rotate2D = function(p, angle) {
    p = p5.strandsNode(p)
    angle = p5.strandsNode(angle)

    let c = this.cos(angle)
    let s = this.sin(angle)

    return this.vec2(
      c.mult(p.x).sub(s.mult(p.y)),
      s.mult(p.x).add(c.mult(p.y))
    )
  }

  fn.envRect = function(dir, center, size, rotation = 0) {
    dir = p5.strandsNode(dir)
    center = p5.strandsNode(center)
    size = p5.strandsNode(size)
    rotation = p5.strandsNode(rotation)

    let up = this.abs(center.y) < 0.99
      ? this.vec3(0, 1, 0)
      : this.vec3(1, 0, 0)
    let xLocal = this.normalize(this.cross(up, center))
    let yLocal = this.cross(center, xLocal)

    // Raw dot-product coordinates in chord space (sin of angle, not radians).
    let px = this.dot(dir, xLocal)
    let py = this.dot(dir, yLocal)

    let cosR = this.cos(rotation)
    let sinR = this.sin(rotation)
    let rpx = cosR.mult(px).add(sinR.mult(py))
    let rpy = cosR.mult(py).sub(sinR.mult(px))

    let half = size.mult(0.5)
    let q = this.abs(this.vec2(rpx, rpy)).sub(half)
    let d = this.length(this.max(q, 0)).add(this.min(this.max(q.x, q.y), 0))

    // Clip to front hemisphere to prevent a false rect at the antipodal point.
    let hemiD = this.acos(this.clamp(this.dot(dir, center), -1, 1)).sub(Math.PI / 2)
    d = this.max(d, hemiD)

    return {
      distance: d,
      thickness: this.min(half.x, half.y),
    }
  }

  fn.envWindow = function(dir, center, size, panes, barWidth) {
    dir = p5.strandsNode(dir)
    center = p5.strandsNode(center)
    size = p5.strandsNode(size)
    panes = p5.strandsNode(panes)
    barWidth = p5.strandsNode(barWidth)

    let up = this.abs(center.y) < 0.99
      ? this.vec3(0, 1, 0)
      : this.vec3(1, 0, 0)
    let xLocal = this.normalize(this.cross(up, center))
    let yLocal = this.cross(center, xLocal)

    // Raw dot-product coordinates in chord space (sin of angle, not radians).
    let p = this.vec2(this.dot(dir, xLocal), this.dot(dir, yLocal))

    let half = size.mult(0.5)

    let q = this.abs(p).sub(half)
    let outerD = this.length(this.max(q, 0)).add(this.min(this.max(q.x, q.y), 0))

    let cell = this.vec2(
      size.x.div(panes.x.sub(1)),
      size.y.div(panes.y.sub(1))
    )

    // position in grid space
    let g = p.add(half)

    // local position within a cell
    let cellP = this.mod(g, cell).sub(cell.mult(0.5))

    // distance to nearest vertical/horizontal bar centerlines
    let barLocal = this.min(
      this.abs(cellP.x),
      this.abs(cellP.y)
    ).sub(barWidth.mult(0.5))

    // final SDF: window clipped, then subtract bars
    let d = this.max(outerD, barLocal.mult(-1))

    // Clip to front hemisphere. Back-hemisphere directions also produce small
    // chord coordinates and would create a false window at the antipodal point
    // without this
    let hemiD = this.acos(this.clamp(this.dot(dir, center), -1, 1)).sub(Math.PI / 2)
    d = this.max(d, hemiD)

    // thickness = size of a single pane (not full window!)
    let paneSize = this.vec2(
      cell.x.sub(barWidth),
      cell.y.sub(barWidth)
    )

    return {
      distance: d,
      thickness: this.min(paneSize.x, paneSize.y).mult(0.5),
    }
  }

  fn.mixEnv = function(result, materialColor, c, blur) {
    c = p5.strandsNode(c)
    materialColor = p5.strandsNode(materialColor)
    blur = p5.strandsNode(blur)

    let d = result.distance
    let thickness = result.thickness
    let mixAmt = this.map(d.sub(blur.div(2)), blur.mult(-1), blur, 1, 0, true)
    let fade = this.min(1, thickness.div(blur))
    mixAmt = mixAmt.mult(fade)
    return this.mix(c, materialColor, mixAmt)
  }

  fn.envLight = function(baseColor, dir, blur) {
    const sketch = this
    let c = p5.strandsNode(baseColor)

    return {
      envCircle(center, radius) {
        return sketch.envCircle(dir, center, radius)
      },
      envCapsule(a, b, radius) {
        return sketch.envCapsule(dir, a, b, radius)
      },
      envStar(center, n, innerRadius, outerRadius, rotation) {
        return sketch.envStar(dir, center, n, innerRadius, outerRadius, rotation)
      },
      envRect(center, size, rotation) {
        return sketch.envRect(dir, center, size, rotation)
      },
      envWindow(center, size, panes, barWidth) {
        return sketch.envWindow(dir, center, size, panes, barWidth)
      },
      envNoise(size) {
        return sketch.envNoise(dir, size, blur)
      },
      envNoisePlane(planeNormal, h, size, { rotation = 0, offset = [0, 0] } = {}) {
        return sketch.envNoisePlane(dir, planeNormal, h, size, blur, { rotation, offset })
      },
      mix(shape, materialColor) {
        c = sketch.mixEnv(shape, materialColor, c, blur)
        return this
      },
      get() {
        return c
      }
    }
  }
}

if (typeof p5 !== 'undefined') {
  p5.registerAddon(envLight)
}
