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
              components.specular = pow(HOOK_envColor(r, ${PI/2}/(1. + 0.25 * uShininess)), vec3(10.));
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

  fn.coords = function(dir, center) {
    dir = p5.strandsNode(dir)
    center = p5.strandsNode(center)

    let up = this.abs(center.y) < 0.99
      ? this.vec3(0,1,0)
      : this.vec3(1,0,0)

    let x = this.normalize(this.cross(up, center))
    let y = this.cross(center, x)

    return this.vec2(
      this.atan(this.dot(dir, x), this.dot(dir, center)),
      this.atan(this.dot(dir, y), this.dot(dir, center))
    )
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

    let p = this.rotate2D(this.coords(dir, center), rotation.mult(-1))
    let half = size.mult(0.5)
    let q = this.abs(p).sub(half)
    return {
      distance: this.length(this.max(q, 0)).add(this.min(this.max(q.x, q.y), 0)),
      thickness: this.min(half.x, half.y),
    }
  }

  fn.envWindow = function(dir, center, size, panes, barWidth) {
    dir = p5.strandsNode(dir)
    center = p5.strandsNode(center)
    size = p5.strandsNode(size)
    panes = p5.strandsNode(panes)
    barWidth = p5.strandsNode(barWidth)

    let p = this.coords(dir, center)

    let half = size.mult(0.5)

    let q = this.abs(p).sub(half)
    let outerD = this.length(this.max(q, 0)).add(this.min(this.max(q.x, q.y), 0))

    // number of cuts
    let nx = panes.x.sub(2)
    let ny = panes.y.sub(2)

    let cell = this.vec2(
      size.x.div(nx.add(1)),
      size.y.div(ny.add(1))
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
}

if (typeof p5 !== 'undefined') {
  p5.registerAddon(envLight)
}
