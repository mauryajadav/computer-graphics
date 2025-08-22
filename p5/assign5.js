////////////////////////////////////////////////////////////////////////
//  A simple WebGL program to draw a 3D cube wirh basic interaction.
//

var gl;
var canvas;
var matrixStack = [];

var type = 3;
var typepass;
var Bounce = 1;
var BounceVal;
var lightPos = [0.0, 10.0, 0.0];
var lightPosLocation;
var uMMatrixLocation;
var aPositionLocation;
var aNormalLocation;
var uColorLocation;

var degree1 = 0.0;
var degree0 = 0.0;

var prevMouseX = 0.0;
var prevMouseY = 0.0;

// initialize model, view, and projection matrices
var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix

// specify camera/eye coordinate system parameters
var eyePosLocation;
var eyePos = [0.0, 0.0, 1.5];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

var zAngle = 0.0;
var yAngle = 0.0;

const phovertexShaderCode = `#version 300 es
precision mediump float;

in vec3 aPosition;

uniform vec3 lightPos;

void main() {
  gl_Position = vec4(aPosition,1.0);
}`;

const phofragShaderCode = ` #version 300 es
precision mediump float;

out vec4 fragColor;

uniform int type;
uniform int Bounce;
uniform vec3 lightPos;
uniform vec4 objColor;

struct Sphere{
  vec3 center;
  float radius;
  vec3 color;
};

struct Ray{
  vec3 origin;
  vec3 direction;
};

vec3 Light;

Sphere sphere[4];
float EPSILON = 0.0001;

bool intersectSphere( out float distance, Ray ray, Sphere sphere) {
  vec3 oc = -sphere.center + ray.origin;

  float a[3];
  a[0] = dot(ray.direction, ray.direction);
  a[1] = 2.0 * dot(oc, ray.direction);
  a[2] = dot(oc, oc) - (sphere.radius * sphere.radius);


  float discriminant = a[1] * a[1] - 4.0 * a[0] * a[2];

  if(discriminant > 0.0){
    float t1 = (-a[1] + sqrt(discriminant)) / (2.0 * a[0]);
    float t2 = (-a[1] - sqrt(discriminant)) / (2.0 * a[0]);
    distance=min(t1, t2);
    if( distance>EPSILON){
      return true;
    }
  }
  return false;
}

vec3 PhongLighting(Ray ray, Sphere sphere, float distance) {

  vec3 hitPoint = ray.origin + ray.direction * distance;
  vec3 normal = normalize(hitPoint - sphere.center);
  vec3 lightDir = normalize(Light - hitPoint);

  float ambient = 0.4;

  float diff = max(dot(normal, lightDir), 0.0);

  vec3 reflectDir = reflect(ray.direction, normal);
  float spec = pow(max(dot(lightDir, reflectDir), 0.0), 32.0);

  vec3 color = vec3(sphere.color*(diff + spec + ambient));

  return color;
}

bool inShadow(Ray ray, float distance){
  vec3 hitPoint = ray.origin + ray.direction * distance;
  ray.origin = hitPoint;
  ray.direction = normalize(Light - hitPoint);
  for(int i=0;i<4;i++){
    if(intersectSphere(distance, ray, sphere[i])){
      return true;
    }
  }
  return false;
}

vec3 reflectbou(Ray ray, Sphere sp, float distance, int depth) {
  vec3 accumulatedColor = vec3(0.0);
  for (int b = 0; b < depth; b++) {
      vec3 hitPoint = ray.origin + ray.direction * distance;
      vec3 normal = normalize(hitPoint - sp.center);
      vec3 incident = normalize(ray.direction);

      vec3 reflectDir = reflect(incident, normal);

      Ray reflectedRay;
      reflectedRay.origin = hitPoint + reflectDir * EPSILON;
      reflectedRay.direction = reflectDir;

      float reflectedDistance=0.0;
      for(int i=0;i<4;i++){
        if (intersectSphere(reflectedDistance, reflectedRay, sphere[i])) {
          accumulatedColor =  mix(accumulatedColor, PhongLighting(reflectedRay, sphere[i], reflectedDistance), 0.5);

          ray = reflectedRay;
          distance = reflectedDistance;
          sp=sphere[i];
          break;

        }

        // Update ray for the next iteration

      }
  }

  return accumulatedColor;
}


void main() {

  sphere[0].center = vec3(0.0, -6.0,-3.0);
  sphere[0].radius = 5.0;
  sphere[0].color = vec3(0.8, 0.8, 0.8);

  sphere[1].center = vec3(0.0, 1.0, -4.0);
  sphere[1].radius = 1.5;
  sphere[1].color = vec3(0.9, 0.0, 0.0);

  sphere[2].center = vec3(1.5, 0.5, -2.0);
  sphere[2].radius = 1.0;
  sphere[2].color = vec3(0.0, 0.0, 0.9);

  sphere[3].center = vec3(-1.5, 0.5, -2.0);
  sphere[3].radius = 1.0;
  sphere[3].color = vec3(0.0, 0.9, 0.0);

  vec3 cameraPos = vec3(0.0, 0.0, 0.0);

  Ray ray;
  ray.origin = cameraPos;
  vec2 screenPos = gl_FragCoord.xy/vec2(800, 800);
  ray.direction = normalize(vec3(screenPos * 2.0 - 1.0, -1.0));
  float distance;

  Light = lightPos;

  fragColor = vec4(0.1, 0.1, 0.1, 1.0);
  for(int i=0;i<4;i++){
    if(intersectSphere(distance, ray, sphere[i])){

      vec3 phongColor = PhongLighting(ray, sphere[i], distance);

      fragColor = vec4(phongColor, 1.0);
      if(type==1 || type==3){
        if(inShadow(ray, distance) && i==0){
          fragColor = vec4(0.2, 0.2, 0.2, 1.0);
        }
      }
      if(type==2 || type==3){
        fragColor=1.25*mix(fragColor, vec4(reflectbou(ray, sphere[i], distance, Bounce),1.0), 0.5);
      }
    }
  }

}`;

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders() {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(phovertexShaderCode);
  var fragmentShader = fragmentShaderSetup(phofragShaderCode);

  // attach the shaders
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  //link the shader program
  gl.linkProgram(shaderProgram);

  // check for compilation and linking status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  //finally use the program.
  gl.useProgram(shaderProgram);

  return shaderProgram;
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context
    gl.viewportWidth = canvas.width; // the width of the canvas
    gl.viewportHeight = canvas.height; // the height
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function pushMatrix(stack, m) {
  //necessary because javascript only does shallow push
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

//////////////////////////////////////////////////////////////////////
//Main drawing routine

function drawScene() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.1, 0.1, 0.1, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //set up view matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  mat4.identity(mMatrix);
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [1, 0, 0]);

  //sphere
  pushMatrix(matrixStack, mMatrix);

  var color = [0.1, 0.1, 0.1, 1];
  drawSquare(color);
  mMatrix = popMatrix(matrixStack);

  mMatrix = popMatrix(matrixStack);
}

// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("assignment5");

  slider = document.getElementById("sliderId");
  slider.addEventListener("input", sliderChanged);

  lislider = document.getElementById("sliderId2");
  lislider.addEventListener("input", lisliderChanged);
  // initialize WebGL
  initGL(canvas);
  // initialize shader program
  initSquareBuffer();
  shaderProgram = initShaders();

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  lightPosLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  BounceVal = gl.getUniformLocation(shaderProgram, "Bounce");
  typepass = gl.getUniformLocation(shaderProgram, "type");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);

  drawScene();
}

var slider;
var lislider;
function sliderChanged() {
  Bounce = parseInt(slider.value);
  drawScene();
}
function lisliderChanged() {
  lightPos[0] = parseFloat(lislider.value);
  drawScene();
}
function changeRender(md) {
  type = md;
  drawScene();
}
