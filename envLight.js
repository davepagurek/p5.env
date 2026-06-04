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
}

if (typeof p5 !== 'undefined') {
  p5.registerAddon(envLight)
}
