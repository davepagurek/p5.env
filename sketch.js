p5.disableFriendlyErrors = true

let myShader

function setup() {
  createCanvas(400, 400, WEBGL);
  
  myShader = buildEnvLightShader(() => {
    envColor.begin()
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

    c = mixEnv(envCircle(envColor.dir, [0, -1, 0], PI*0.5), sky, c, envColor.blur)
    // c = mixEnv(acos(dot(envColor.dir, [0, -1, 0])) - PI*0.5, PI*0.5, sky)
    
    c = mixEnv(envCircle(envColor.dir, normalize([-0.5, -1, 0.5]), PI*0.05), vec3(1.4), c, envColor.blur)
    
    c = mixEnv(envWindow(envColor.dir, normalize([1, -0.5, 0]), [PI*0.2, PI*0.35], [2, 2], PI*0.05), vec3(1.4), c, envColor.blur)
    
    // c = mixEnv(envRect(envColor.dir, normalize([1, 0, 0]), [PI*0.05,PI*0.1]), vec3(1.4), c, envColor.blur)
    // c = mixEnv(envRect(envColor.dir, normalize([1, 0, 0.3]), [PI*0.05,PI*0.1]), vec3(1.4), c, envColor.blur)
    // c = mixEnv(envRect(envColor.dir, normalize([1, -0.5, 0]), [PI*0.05,PI*0.1]), vec3(1.4), c, envColor.blur)
    // c = mixEnv(envRect(envColor.dir, normalize([1, -0.5, 0.3]), [PI*0.05,PI*0.1]), vec3(1.4), c, envColor.blur)
    // c = mixEnv(acos(dot(envColor.dir, normalize([0.5, -1, 0.5]))) - PI*0.05, PI*0.05, [1, 1, 1] * 1.4)
    
    envColor.set(c)
    envColor.end()
  })
  // console.log(myShader.fragSrc())
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