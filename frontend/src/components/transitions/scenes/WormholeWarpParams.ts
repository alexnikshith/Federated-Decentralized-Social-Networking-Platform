import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

export const WormholeMaterial = shaderMaterial(
    {
        time: 0,
        colorStart: new THREE.Color("#FFBA08"),
        colorEnd: new THREE.Color("#240046"),
        speed: 1.0,
        distortion: 0.5,
        opacity: 1.0,
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    uniform float speed;
    uniform float distortion;

    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

        // First corner
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        //   x0 = x0 - 0.0 + 0.0 * C.xxx;
        //   x1 = x0 - i1  + 1.0 * C.xxx;
        //   x2 = x0 - i2  + 2.0 * C.xxx;
        //   x3 = x0 - 1.0 + 3.0 * C.xxx;
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
        vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

        // Permutations
        i = mod289(i);
        vec4 p = permute( permute( permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        // Gradients: 7x7 points over a square, mapped onto an octahedron.
        // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
        float n_ = 0.142857142857; // 1.0/7.0
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
        //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        //Normalise gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
        vUv = uv;
        vPosition = position;
        
        // Add waving distortion to the tube based on time and Z position
        vec3 pos = position;
        
        // Noise distortion along the tunnel
        float noiseFreq = 0.5;
        float noiseAmp = distortion;
        vec3 noisePos = vec3(pos.x * noiseFreq, pos.y * noiseFreq, pos.z * noiseFreq + time * speed);
        
        pos.x += snoise(noisePos) * noiseAmp;
        pos.y += snoise(noisePos + vec3(100.0)) * noiseAmp;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
    `,
    // Fragment Shader
    `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    uniform vec3 colorStart;
    uniform vec3 colorEnd;
    uniform float speed;
    uniform float opacity;

    void main() {
        // Create spiral and procedural streaks
        float stretch = 10.0;
        
        // Move the pattern along the tube
        vec2 st = vUv;
        st.x += time * speed * 0.5; // Flow down the tube
        
        // Add spiraling effect
        st.y += time * speed * 0.1;
        
        // Vertical lines (forming streaks down the tube)
        float noise = sin(st.y * 50.0) * cos(st.y * 20.0 + st.x * stretch);
        
        // Base color mixed based on depth (vUv.x represents length from 0 to 1)
        vec3 color = mix(colorEnd, colorStart, vUv.x);
        
        // Add bright glowing streaks
        float streaks = smoothstep(0.8, 1.0, noise);
        color += streaks * vec3(1.0, 0.8, 0.5); // Add gold/bright streaks
        
        // Fade out at the very beginning to blend with the camera
        float alpha = smoothstep(0.0, 0.1, vUv.x) * opacity;
        
        gl_FragColor = vec4(color, alpha);
    }
    `
);

// Register the custom material so we can use it declaratively in R3F (<wormholeMaterial />)
extend({ WormholeMaterial });

declare module '@react-three/fiber' {
    interface ThreeElements {
        wormholeMaterial: React.JSX.IntrinsicElements['shaderMaterial'] & {
            ref?: React.Ref<any>;
            time?: number;
            colorStart?: THREE.Color;
            colorEnd?: THREE.Color;
            speed?: number;
            distortion?: number;
            opacity?: number;
        };
    }
}
