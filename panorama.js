p5.disableFriendlyErrors = true

let envShader
let panoramaShader

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL)
  pixelDensity(1)

  const envHooks = () => {
    envColor.begin()
    let sunAngle = millis() * 0.0003
    let sunDir = normalize(vec3(sin(sunAngle), cos(sunAngle) * -1, 1))
    let daylight = map(dot(sunDir, [0, -1, 0]), -1, 1, 0, 1)
    let ground = uniformVec3(color('#996d5b'))
    ground *= map(daylight, 0.2, 0.6, 0, 1, true)
    let nightSkyColor = vec3(0.08, 0.08, 0.25)
    let sunColor     = mix(nightSkyColor, vec3(4.0, 3.5, 2.0) * 0.7,  daylight)
    let skyColor     = mix(nightSkyColor, vec3(0.5, 0.75, 1.0), daylight)
    let horizonColor = mix(mix(nightSkyColor, vec3(0.5, 0.2, 0.45), map(daylight, 0.2, 0.5, 0, 1, true)), vec3(0.3, 0.55, 1.0) * 0.7 + 0.4, daylight)
    let sky = envGradient(envColor.dir, [0, -1, 0], envColor.blur,
      { t: PI * 0.3,  color: skyColor },
      { t: PI * 0.55, color: horizonColor },
    )
    let l = envLight(sky, envColor.dir, envColor.blur)
    l.mix(l.envCircle(sunDir, PI * 0.04), sunColor)
    l.mix(l.envCircle([0, 1, 0], PI * 0.5), ground)
    envColor.set(l.get())
    envColor.end()
  }

  envShader = buildEnvLightShader(envHooks)
  panoramaShader = buildEnvLightPanorama(envHooks)
}

function draw() {
  background(255)
  orbitControl()
  panoramaEnv(panoramaShader)
  noStroke()
  shader(envShader)
  fill(100)
  specularMaterial(200)
  shininess(50)
  sphere(150)
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}
