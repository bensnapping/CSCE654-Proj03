#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform sampler2D u_tex0; // environment
uniform sampler2D u_tex1; // normal map
uniform sampler2D u_tex2; // diffuse
uniform sampler2D u_tex3; // reflectivity map
uniform sampler2D u_tex4; // shadows
uniform sampler2D u_tex5; // height

float random (vec2 st) {
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
}

vec4 color_mix(vec4 base_col, vec4 top_col, float top_factor)
{
	return (base_col * (1.0 - top_factor)) + (top_col * top_factor);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord / u_resolution.xy;

	// The base color of the output image
	vec4 base_color = vec4(0.0);

	// material constants
    vec4 specularity = vec4(1.0,1.0,0.0, 1.0);
    vec4 ambient = vec4(0.10,0.20,0.70, 1.0);
    vec4 diffuse = vec4(0.90,0.70,0.20, 1.0);
    vec4 env_img = texture2D(u_tex0, uv);
    vec4 nrm_img = texture2D(u_tex1, uv);
    vec4 dif_img = texture2D(u_tex2, uv);
    vec4 rfl_img = texture2D(u_tex3, uv);
	vec4 shd_img = texture2D(u_tex4, uv);
	vec4 hgt_img = texture2D(u_tex5, uv);

	// scene camera definition
	vec3 camera = vec3(0.0,0.0,10.0);
    camera -= vec3(fragCoord,0.0);
    camera /= length(camera);
	
	// direction to each pixel from the camera
    vec3 dir = camera - vec3(fragCoord, 0.0);
    dir /= length(dir);
    
	// scene light definition
    float d=100.0; // depth?
	vec3 lightpos = vec3(u_mouse.x,u_mouse.y,d/4.0);
	vec3 lightdir = lightpos - vec3(fragCoord, 0.0);
	lightdir /= length(lightdir);

	// set up for using the normal information
    vec3 normals;
    vec3 reflect;

	// normalize the normals between 0 and 1
	normals= (2.0 * nrm_img.rgb) - vec3(1.0);
    normals /= length(normals);

	// height and shadow setup
	const int sample_count = 100; 
    float depth_step = 0.5;
	float R = depth_step;
    vec3 shader_point = vec3(fragCoord, (1.0+depth_step)*hgt_img.x - depth_step);
    float a = 5.0; // alpha??
    
    vec3 shadow_vector = lightpos - shader_point;
	shadow_vector /= length(shadow_vector);
    
    
    for (int i = 0; i < sample_count; i++) {
		vec3 pos = shader_point + float(i)*depth_step*a*shadow_vector + 0.00125*vec3(random(shader_point.xy));
		vec2 pos_uv = pos.xy/u_resolution.xy;
		vec4 hgt_img_with_depth = texture2D(u_tex5, pos_uv);
		if(hgt_img_with_depth.x > pos.z) R += depth_step;
    }
    
    float cast_shadow_factor = depth_step/R;
    cast_shadow_factor=2.0*pow(cast_shadow_factor,0.45);
    cast_shadow_factor=clamp(cast_shadow_factor,0.0,1.0);
	
	// get the reflection direction for this pixel
    reflect = 2.0*dot(dir,normals)*normals - dir;

	// compositing factors for the different light passes
	float reflect_factor = 0.4;
	float normal_shading_factor = clamp(dot(normals, lightdir), 0.0, 1.0);
	float diff_light_factor = 0.5*dot(lightdir,normals)+0.5;
    float spec_light_factor = 0.5*dot(reflect,dir)+0.5;

	// getting the pixel color returned by the reflected ray
	vec2 reflected_uv = (reflect.xy*d/(reflect.z+0.1)+fragCoord) / u_resolution.xy;

	// rotate the reflected_uv to make it look
	// like the environment is rotating
	float theta = 1.5 * sin(u_time);
	reflected_uv = vec2(
				(reflected_uv.x*cos(theta)) - (reflected_uv.y*sin(theta)),
				(reflected_uv.x*sin(theta)) + (reflected_uv.y*cos(theta))
			);

    vec4 reflected_env = texture2D(u_tex0, reflected_uv);

	// composite the different layers on top of eachother
	vec4 nrm_shadows = color_mix(shd_img, dif_img, normal_shading_factor);
	vec4 cast_shadows = color_mix(shd_img, nrm_shadows, cast_shadow_factor);
	vec4 reflect_on_diff = clamp(color_mix(cast_shadows, reflected_env, reflect_factor*rfl_img.x), 0.0, 1.0);
	

    // Output the final color
	fragColor = reflect_on_diff;

	// if(fragCoord.x >= u_mouse.x - 10.0 && fragCoord.x <= u_mouse.x + 10.0){
	// 	fragColor = vec4(1.0, 0.0, 0.0, 1.0);
	// }
	// if(fragCoord.y >= u_mouse.y - 10.0 && fragCoord.y <= u_mouse.y + 10.0){
	// 	fragColor = vec4(1.0, 0.0, 0.0, 1.0);
	// }

}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}

