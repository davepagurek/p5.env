let baseShader
let myShader

function setup() {
  createCanvas(400, 400, WEBGL);
  
  baseShader = new p5.Shader(
    baseMaterialShader()._renderer,
    baseMaterialShader()._vertSrc,
    baseMaterialShader()._fragSrc,
    {
      declarations: 'vec3 n; vec3 r;',
      vertex: {
        ...baseMaterialShader().hooks.vertex,
      },
      fragment: {
        'vec3 envColor': `(vec3 dir, float blur) { return vec3(0.); }`,
        ...baseMaterialShader().hooks.fragment,
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
  // Run this to see the GLSL types you need to use:
  baseShader.inspectHooks()
  
  myShader = baseShader.modify(() => {
    envColor.begin()
    let d = envColor.blur
    let sky = uniformVec3(color('#CFE9F6'))
    let ground = uniformVec3(color('#CF7C5C'))
    
    let c = ground
    
//     function coords(dir, center, rotation = 0) {
//       let up = abs(center[1]) < 0.99
//         ? [0, 1, 0]
//         : [1, 0, 0]

//       let x = normalize(cross(up, center))
//       let y = cross(center, x)

//       let p = vec2(
//         atan(dot(dir, x), dot(dir, center)),
//         atan(dot(dir, y), dot(dir, center))
//       )

//       let c = cos(rotation)
//       let s = sin(rotation)

//       return vec2(
//         c * p.x - s * p.y,
//         s * p.x + c * p.y
//       )
//     }

    function coords(dir, center) {
      let up = abs(center.y) < 0.99
        ? vec3(0,1,0)
        : vec3(1,0,0)

      let x = normalize(cross(up, center))
      let y = cross(center, x)

      return vec2(
        atan(dot(dir, x), dot(dir, center)),
        atan(dot(dir, y), dot(dir, center))
      )
    }
    
    function rotate2D(p, angle) {
      let c = cos(angle)
      let s = sin(angle)

      return vec2(
        c * p.x - s * p.y,
        s * p.x + c * p.y
      )
    }
    
    function envCircle(dir, center, radius) {
      return {
        distance: acos(dot(dir, center)) - radius,
        thickness: radius,
      }
    }

    function envRect(dir, center, size, rotation = 0) {
      let p = rotate2D(coords(dir, center), -rotation)
      let half = size * 0.5
      let q = abs(p) - half
      let thickness = min(
        half.x - abs(p.x),
        half.y - abs(p.y)
      )
      return {
        distance: length(max(q, 0)) + min(max(q.x, q.y), 0),
        thickness: min(half.x, half.y),
      }
    }
    
    function envWindow(dir, center, size, panes, barWidth) {
      let p = coords(dir, center)

      let half = size * 0.5

      let q = abs(p) - half
      let outerD =
        length(max(q, 0)) +
        min(max(q.x, q.y), 0)

      // number of cuts
      let nx = panes.x - 2
      let ny = panes.y - 2

      let cell = vec2(
        size.x / (nx + 1),
        size.y / (ny + 1)
      )

      // position in grid space
      let g = p + half

      // local position within a cell
      let cellP = mod(g, cell) - cell * 0.5

      // distance to nearest vertical/horizontal bar centerlines
      let barLocal = min(
        abs(cellP.x),
        abs(cellP.y)
      ) - barWidth * 0.5

      // bars carve into panes
      let barD = barLocal

      // final SDF: window clipped, then subtract bars
      let d = max(outerD, -barD)

      // thickness = size of a single pane (not full window!)
      let paneSize = vec2(
        cell.x - barWidth,
        cell.y - barWidth
      )

      return {
        distance: d,
        thickness: min(paneSize.x, paneSize.y) * 0.5,
      }
    }

    
    function blendSDF(result, materialColor) {
      let d = result.distance
      let thickness = result.thickness
      let mixAmt = map(d - envColor.blur / 2, -envColor.blur, envColor.blur, 1, 0, true)
      let fade = min(1, thickness / envColor.blur)
      mixAmt *= fade
      return mix(c, materialColor, mixAmt)
    }
    
    c = blendSDF(envCircle(envColor.dir, [0, -1, 0], PI*0.5), sky)
    // c = blendSDF(acos(dot(envColor.dir, [0, -1, 0])) - PI*0.5, PI*0.5, sky)
    
    c = blendSDF(envCircle(envColor.dir, normalize([-0.5, -1, 0.5]), PI*0.05), vec3(1.4))
    
    c = blendSDF(envWindow(envColor.dir, normalize([1, -0.5, 0]), [PI*0.2, PI*0.35], [2, 2], PI*0.05), vec3(1.4))
    
    // c = blendSDF(envRect(envColor.dir, normalize([1, 0, 0]), [PI*0.05,PI*0.1]), vec3(1.4))
    // c = blendSDF(envRect(envColor.dir, normalize([1, 0, 0.3]), [PI*0.05,PI*0.1]), vec3(1.4))
    // c = blendSDF(envRect(envColor.dir, normalize([1, -0.5, 0]), [PI*0.05,PI*0.1]), vec3(1.4))
    // c = blendSDF(envRect(envColor.dir, normalize([1, -0.5, 0.3]), [PI*0.05,PI*0.1]), vec3(1.4))
    // c = blendSDF(acos(dot(envColor.dir, normalize([0.5, -1, 0.5]))) - PI*0.05, PI*0.05, [1, 1, 1] * 1.4)
    
    envColor.set(c)
    envColor.end()
  })
  console.log(myShader.fragSrc())
}

function draw() {
  background(255)
  orbitControl()
  noStroke()
  shader(myShader)
  let n = 3
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      push()
      translate(
        map(i, 0, n, -width*0.35, width*0.35),
        map(j, 0, n, -height*0.35, height*0.35),
      )
      fill(map(j, 0, n, 0, 200))
      specularMaterial(map(j, 0, n, 100, 1))
      shininess(map(i, 0, n, 0, 150))
      sphere(40)
      pop()
    }
  }
}