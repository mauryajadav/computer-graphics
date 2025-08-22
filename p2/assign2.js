////////////////////////////////////////////////////////////////////////
//  A simple WebGL program to draw a 3D cube wirh basic interaction.
//

var gl;
var canvas;
var matrixStack = [];

var type = 0;
var lightPos = [0.0, 0.0, 2.5];
var lightPosLocation;
var aPositionLocation;
var aNormalLocation;
var uColorLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;

var degree11 = 0.0;
var degree10 = 0.0;
var degree21 = 0.0;
var degree20 = 0.0;
var degree31 = 0.0;
var degree30 = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;

// initialize model, view, and projection matrices
var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix

// specify camera/eye coordinate system parameters
var eyePosLocation;
var eyePos = [0.0, 0.0, 2.5];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

var zAngle = 0.0;
var yAngle = 0.0;

const vertexShaderCode = `#version 300 es
in vec3 aPosition;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);
  gl_PointSize=5.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec4 objColor;

void main() {
  fragColor = objColor;
}`;

//prevertex shader

const flatvertexShaderCode = `#version 300 es
precision mediump float;
in vec3 aPosition;
in vec3 aNormal;
uniform vec3 lightPos;
out vec3 posInEyeSpace;
out vec3 viewDir;
out vec3 lightPosEyeSpace;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

void main() {
    mat4 projectionModelView = uPMatrix * uVMatrix * uMMatrix;
    gl_Position = projectionModelView * vec4(aPosition, 1.0);
    vec3 normal = normalize(mat3(transpose(inverse(uVMatrix * uMMatrix))) * aNormal);
    lightPosEyeSpace = (uVMatrix * vec4(-lightPos, 1.0)).xyz;
    posInEyeSpace = vec3(uVMatrix* uMMatrix * vec4(aPosition, 1.0));
    viewDir = -normalize(posInEyeSpace);

    gl_PointSize = 5.0;
}`;

const flatfragShaderCode = `#version 300 es
precision mediump float;
in vec3 viewDir;
in vec3 posInEyeSpace;
in vec3 lightPosEyeSpace;
out vec4 fragColor;
uniform vec4 objColor;

void main() {
    vec3 dPosdx = dFdx(posInEyeSpace);
    vec3 dPosdy = dFdy(posInEyeSpace);
    vec3 normal = normalize(cross(dPosdx, dPosdy));

    vec3 lightDir = normalize(-lightPosEyeSpace -posInEyeSpace);
    vec3 R = normalize(-reflect(lightDir, normal));

    vec4 Iamb = vec4(0.2, 0.2, 0.2, 1.0) * objColor;
    vec4 Idiff = objColor * max(dot(normal, lightDir), 0.0);
    vec4 Ispec = objColor * pow(max(dot(viewDir, R), 0.0), 10.0);

    fragColor = Iamb + Idiff +Ispec;
}`;

//gouraud shader
const gouvertexShaderCode = `#version 300 es
precision mediump float;

in vec3 aPosition;
in vec3 aNormal;
uniform vec4 objColor;
out vec4 vertexColor;
uniform vec3 lightPos;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

void main() {
    mat4 projectionModelView = uPMatrix * uVMatrix * uMMatrix;
    gl_Position = projectionModelView * vec4(aPosition, 1.0);

   vec3 posInEyeSpace = vec3(uVMatrix* uMMatrix * vec4(aPosition, 1.0));

    vec3 lightPosEyeSpace = (uVMatrix * vec4(-lightPos, 1.0)).xyz;

    vec3 lightDir = normalize(-lightPosEyeSpace - posInEyeSpace);

    vec3 normal = normalize(mat3(transpose(inverse(uVMatrix * uMMatrix))) * aNormal);
    vec3 R = normalize(-reflect(lightDir, normal));

    vec3 viewDir = normalize(-posInEyeSpace);

    vec4 Iamb = vec4(0.2, 0.2, 0.2, 1.0) * objColor ;
    vec4 Idiff = objColor  * max(dot(normal, lightDir), 0.0);
    vec4 Ispec =  objColor * pow(max(dot(viewDir, reflect(-lightDir, normal)), 0.0), 10.0);
    vertexColor = Iamb + Idiff + Ispec;
}`;

const goufragShaderCode = `#version 300 es
precision mediump float;
in vec4 vertexColor;

out vec4 fragColor;

uniform vec4 objColor;

void main() {

    fragColor = vertexColor;
}`;

// phong shader

const phovertexShaderCode = `#version 300 es
precision mediump float;

in vec3 aPosition;
in vec3 aNormal;
out vec3 fragNormal;
out vec3 fragLightDir;
out vec3 fragViewDir;

uniform vec3 lightPos;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

void main() {
    mat4 projectionModelView = uPMatrix * uVMatrix * uMMatrix;
    gl_Position = projectionModelView * vec4(aPosition, 1.0);

   vec3 posInEyeSpace = vec3(uVMatrix* uMMatrix * vec4(aPosition, 1.0));

    vec3 lightPosEyeSpace = (uVMatrix * vec4(-lightPos, 1.0)).xyz;

    vec3 lightDir = normalize(-lightPosEyeSpace - posInEyeSpace);

    vec3 normal = normalize(mat3(transpose(inverse(uVMatrix * uMMatrix))) * aNormal);
    vec3 R = normalize(-reflect(lightDir, normal));

    vec3 viewDir = normalize(-posInEyeSpace);

    fragNormal = normal;
    fragLightDir = lightDir;
    fragViewDir = viewDir;
}`;

const phofragShaderCode = ` #version 300 es
precision mediump float;

in vec3 fragNormal;
in vec3 fragLightDir;
in vec3 fragViewDir;

out vec4 fragColor;

uniform vec4 objColor;

void main() {
    vec4 Iamb = vec4(0.2, 0.2, 0.2, 1.0) * objColor;
    vec4 Idiff = objColor * max(dot(fragNormal, fragLightDir), 0.0);
    vec4 Ispec = objColor * pow(max(dot(fragViewDir, reflect(-fragLightDir, fragNormal)), 0.0), 10.0);

    fragColor = Iamb + Idiff + Ispec;
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

function initShaders(type) {
  shaderProgram = gl.createProgram();
  if (type == 0) {
    var vertexShader = vertexShaderSetup(phovertexShaderCode);
    var fragmentShader = fragmentShaderSetup(phofragShaderCode);
  }
  if (type == 1) {
    var vertexShader = vertexShaderSetup(flatvertexShaderCode);
    var fragmentShader = fragmentShaderSetup(flatfragShaderCode);
  }
  if (type == 2) {
    var vertexShader = vertexShaderSetup(gouvertexShaderCode);
    var fragmentShader = fragmentShaderSetup(goufragShaderCode);
  }

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

function drawScene1() {
  gl.enable(gl.SCISSOR_TEST);
  gl.enable(gl.DEPTH_TEST);
  gl.viewport(0, 0, canvas.width / 3, canvas.height);
  gl.scissor(0, 0, canvas.width / 3, canvas.height);
  gl.clearColor(0.85, 0.85, 0.95, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //set up view matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  mat4.identity(mMatrix);
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree10), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree11), [1, 0, 0]);

  //sphere
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, 0.6, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.35, 0.35, 0.35]);

  var color = [0.0, 0.4, 0.6, 1];
  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //cube
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.25, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.7, 1.0, 0.7]);
  var color = [0.68, 0.68, 0.47, 1];
  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  mMatrix = popMatrix(matrixStack);
}

function drawScene2() {
  gl.enable(gl.SCISSOR_TEST);
  gl.enable(gl.DEPTH_TEST);
  gl.viewport(canvas.width / 3, 0, canvas.width / 3, canvas.height);
  gl.scissor(canvas.width / 3, 0, canvas.width / 3, canvas.height);
  gl.clearColor(0.95, 0.85, 0.85, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //set up view matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);
  var spcolor = [0.65, 0.65, 0.65, 1];
  var cubecolor = [0.0, 0.5, 0.0, 1];

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree20), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree21), [1, 0, 0]);
  //sphere1

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);

  drawSphere(spcolor);
  mMatrix = popMatrix(matrixStack);

  //cube1
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.5, 0.05, 0.0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-30), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);
  drawCube(cubecolor);
  mMatrix = popMatrix(matrixStack);

  //sphere2
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.3, 0.5, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
  drawSphere(spcolor);
  mMatrix = popMatrix(matrixStack);

  //cube2
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, 0.7, -0.1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-45), [1, 0, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(30), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
  drawCube(cubecolor);
  mMatrix = popMatrix(matrixStack);

  //sphere3
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, 0.88, 0.05]);
  mMatrix = mat4.scale(mMatrix, [0.15, 0.15, 0.15]);
  drawSphere(spcolor);
  mMatrix = popMatrix(matrixStack);
}

function drawScene3() {
  gl.enable(gl.SCISSOR_TEST);
  gl.enable(gl.DEPTH_TEST);
  gl.viewport((2 * canvas.width) / 3, 0, canvas.width / 3, canvas.height);
  gl.scissor((2 * canvas.width) / 3, 0, canvas.width / 3, canvas.height);
  gl.clearColor(0.85, 0.95, 0.85, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //set up view matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  mat4.identity(mMatrix);
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree31), [1, 0, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(45), [0, 1, 0]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.45, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.75, 0.75, 0.75]);

  //sphere l1
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.35, 0.35, 0.35]);
  var color = [0, 0.7, 0.1, 1];
  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //cube l1
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.1, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1.75, 0.1, 0.5]);
  var color = [0.6, 0.2, 0.1, 1];
  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  //sphere l2 left
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.75, 0.2, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
  var color = [0.3, 0.3, 0.6, 1];
  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //sphere l2 right
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.75, 0.2, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
  var color = [0.1, 0.4, 0.45, 1];
  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //cube l2 left
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.75, 0.5, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.35, 0.1, 1.0]);
  var color = [0.6, 0.6, 0, 1];
  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  //cube l2 right
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.75, 0.5, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.35, 0.1, 1.0]);
  var color = [0.2, 0.6, 0.5, 1];
  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  //sphere l3 left
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.75, 0.8, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
  var color = [0.6, 0, 0.6, 1];
  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //sphere l3 right
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.75, 0.8, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
  var color = [0.5, 0.4, 0.1, 1];
  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //cube l3
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, 1.1, -0.1]);
  mMatrix = mat4.scale(mMatrix, [1.75, 0.1, 0.5]);
  var color = [0.6, 0.2, 0.1, 1];
  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  //sphere l1
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, 1.5, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.35, 0.35, 0.35]);
  var color = [0.4, 0.4, 0.5, 1];
  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  mMatrix = popMatrix(matrixStack);
}

function drawScene() {
  shaderProgram = initShaders(1);

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  lightPosLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  drawScene1();

  shaderProgram = initShaders(2);

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  lightPosLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  drawScene2();

  shaderProgram = initShaders(0);

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  lightPosLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);

  drawScene3();
}

// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("assignment2");
  document.addEventListener("mousedown", onMouseDown, false);

  slider = document.getElementById("sliderId");
  slider.addEventListener("input", sliderChanged);

  lislider = document.getElementById("sliderId2");
  lislider.addEventListener("input", lisliderChanged);
  // initialize WebGL
  initGL(canvas);
  // initialize shader program

  initCubeBuffer();
  initSphereBuffer();
  drawScene();
}

var slider;
var lislider;
function sliderChanged() {
  eyePos[2] = parseFloat(slider.value) / 10.0;
  drawScene();
}
function lisliderChanged() {
  lightPos[0] = parseFloat(lislider.value);
  drawScene();
}

function onMouseDown(event) {
  document.addEventListener("mousemove", onMouseMove, false);
  document.addEventListener("mouseup", onMouseUp, false);
  document.addEventListener("mouseout", onMouseOut, false);

  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    prevMouseX = event.clientX;
    prevMouseY = canvas.height - event.clientY;
  }
}

function onMouseMove(event) {
  // make mouse interaction only within canvas
  if (
    event.layerX <= canvas.width / 3 &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;
    degree10 = degree10 + diffX1 / 5;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;
    degree11 = degree11 - diffY2 / 5;

    drawScene();
  }
  if (
    event.layerX <= (2 * canvas.width) / 3 &&
    event.layerX >= canvas.width / 3 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;
    degree20 = degree20 + diffX1 / 5;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;
    degree21 = degree21 - diffY2 / 5;

    drawScene();
  }
  if (
    event.layerX <= canvas.width &&
    event.layerX >= (2 * canvas.width) / 3 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;
    degree30 = degree30 + diffX1 / 5;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;
    degree31 = degree31 - diffY2 / 5;

    drawScene();
  }
}

function onMouseUp(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}
