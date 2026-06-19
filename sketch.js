p5.disableFriendlyErrors = true

let myShader
let pano

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL)
  // pixelDensity(1)

  const env = () => {
    envColor.begin()
    let ground = uniformVec3(color('#564943'))

    // Sun orbits in the x-y plane. At angle 0 the sun is at the zenith [0,-1,0].
    let sunAngle =  PI * 0.45 // millis() * 0.0003
    let sunDir = normalize(vec3(0.35, cos(sunAngle) * -1, -sin(sunAngle)))
    // 1 at noon, fades to 0 at the horizon, stays 0 through the night
    let daylight = map(dot(sunDir, [0, -1, 0]), -1, 1, 0, 1)
    ground *= map(daylight, 0.2, 0.6, 0, 1, true)
    let nightSkyColor = vec3(0.08, 0.08, 0.25)

    let sunColor     = mix(nightSkyColor, vec3(4.0, 3.5, 2.0) * 2,  daylight)
    let skyColor     = mix(nightSkyColor, vec3(0.5, 0.75, 1.0), daylight)
    let horizonColor = mix(mix(nightSkyColor, vec3(0.5, 0.2, 0.45), map(daylight, 0.2, 0.5, 0, 1, true)), vec3(0.3, 0.55, 1.0) * 0.7 + 0.4, daylight)

    // Sky gradient centered on the sun: warms near the sun, cools further away
    let sky = envGradient(envColor.dir, [0, -1, 0], envColor.blur,
      { t: PI * 0.3,  color: skyColor },
      { t: PI * 0.55, color: horizonColor },
    )

    // Sun is the base layer, sky goes on top, ground on top of both
    let l = envLight(sky, envColor.dir, envColor.blur)
    l.mix(l.circle(sunDir, PI * 0.02), sunColor)
    l.mix(l.circle([0, 1, 0], PI * 0.5), ground)

    // l.mix(l.window(normalize([1, -0.5, 0]), [PI*0.2, PI*0.35], [2, 2], PI*0.05), vec3(1.4))
    // l.mix(l.star(normalize([-1, -0.5, 0]), 5, PI*0.05, PI*0.1, millis()*0.001), vec3(1.4))
    // let t = millis() * 0.00005
    // let cloudySky = mix(sky * 0.5, vec3(1), l.noisePlane([0, 1, 0], 0.5, 0.4, { offset: [t, t * 0.4] }))

    // l.mix(l.capsule(normalize([1, -0.5, 0]), normalize([1, 0.5, 0]), PI*0.05), vec3(1.4))
    // l.mix(l.rect(normalize([1, 0, 0]), [PI*0.05,PI*0.1]), vec3(1.4))
    // l.mix(l.rect(normalize([1, 0, 0.3]), [PI*0.05,PI*0.1]), vec3(1.4))
    // l.mix(l.rect(normalize([1, -0.5, 0]), [PI*0.05,PI*0.1]), vec3(1.4))
    // l.mix(l.rect(normalize([1, -0.5, 0.3]), [PI*0.05,PI*0.1]), vec3(1.4))

    envColor.set(l.get())
    envColor.end()
  }
  myShader = buildEnvMaterial(env)
  pano = buildEnvPanorama(env)
  console.log(myShader.fragSrc())
}

function draw() {
  background(255)
  orbitControl()
  pano(PI * 0.01)
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
      fill(200, 20, 20)
      specularMaterial(50)
      metalness(pow(map(j, 0, n, 0, 1), 2) * 200)
      shininess(pow(map(i, 0, n, 0, 1), 2) * 400)
      // shininess(map(mouseX, 0, width, 0, 200))
      sphere(40)
      pop()
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}
