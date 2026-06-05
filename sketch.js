p5.disableFriendlyErrors = true

let myShader

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL)
  pixelDensity(1)
  
  myShader = buildEnvLightShader(() => {
    envColor.begin()
    let sky = uniformVec3(color('#CFE9F6'))
    let ground = uniformVec3(color('#996d5b'))
    
    let c = ground

    let cloudySky = mix(sky, vec3(1), envNoisePlane(envColor.dir, [0, 1, 0], 0.1, 0.4, envColor.blur))
    // c = mixEnv(envCircle(envColor.dir, [0, -1, 0], PI*0.5), sky, c, envColor.blur)
    c = mixEnv(envCircle(envColor.dir, [0, -1, 0], PI*0.5), cloudySky, c, envColor.blur)
    // c = mixEnv(acos(dot(envColor.dir, [0, -1, 0])) - PI*0.5, PI*0.5, sky)
    
    c = mixEnv(envCircle(envColor.dir, normalize([-0.5, -1, 0.5]), PI*0.05), vec3(1.4), c, envColor.blur)
    
    // c = mixEnv(envWindow(envColor.dir, normalize([1, -0.5, 0]), [PI*0.2, PI*0.35], [2, 2], PI*0.05), vec3(1.4), c, envColor.blur)
    // c = mixEnv(envCapsule(envColor.dir, normalize([1, -0.5, 0]), normalize([1, 0.5, 0]), PI*0.05), vec3(1.4), c, envColor.blur)
    
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
  scale(min(width / 600, height / 600))
  noStroke()
  shader(myShader)
  let n = 3
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      push()
      translate(
        map(i, 0, n, -400*0.35, 400*0.35),
        map(j, 0, n, -400*0.35, 400*0.35),
      )
      fill(0.8 * map(j, 0, n, 50, 205))
      specularMaterial(map(j, 0, n, 205, 50))
      shininess(pow(map(i, 0, n, 0, 1), 2) * 400)
      sphere(40)
      pop()
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}