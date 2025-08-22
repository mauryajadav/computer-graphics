////////////////////////////////////////////////////////////////////////
// Assignment 1
var gl;
var color;
var animation;
var degree = 0;
var trans = 0;
var sign = 1;
var matrixStack = [];
var rendermode;
// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uColorLoc;

var circleBuf;
var circleIndexBuf;
var sqBuf;
var sqIndexBuf;

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 5.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
}`;

function pushMatrix(stack, m) {
  //necessary because javascript only does shallow push
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

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

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

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

function initSquareBuffer() {
  // buffer for point locations
  const sqVertices = new Float32Array([
    0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  ]);
  sqBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqBuf);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  sqBuf.itemSize = 2;
  sqBuf.numItems = 4;

  // buffer for point indices
  const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  sqIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
  sqIndexBuf.itemsize = 1;
  sqIndexBuf.numItems = 6;
}

function initTriangleBuffer() {
  // buffer for point locations
  const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
  triangleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  triangleBuf.itemSize = 2;
  triangleBuf.numItems = 3;

  // buffer for point indices
  const triangleIndices = new Uint16Array([0, 1, 2]);
  triangleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
  triangleIndexBuf.itemsize = 1;
  triangleIndexBuf.numItems = 3;
}

function initCircleBuffer() {
  // buffer for point locations

  const numVer = 30;
  const circleVertices = new Float32Array(numVer * 2 + 2);
  circleVertices[0] = 0;
  circleVertices[1] = 0;
  for (var i = 1; i <= numVer; i++) {
    circleVertices[2 * i] = 0.5 * Math.cos((i * 2 * Math.PI) / numVer);
    circleVertices[2 * i + 1] = 0.5 * Math.sin((i * 2 * Math.PI) / numVer);
  }

  console.log(circleVertices);
  circleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);
  circleBuf.itemSize = 2;
  circleBuf.numItems = numVer + 1;

  // buffer for point indices
  const circleIndices = new Uint16Array(numVer * 3);
  for (var i = 0; i < numVer; i++) {
    circleIndices[3 * i] = 0;
    circleIndices[3 * i + 1] = i + 1;
    circleIndices[3 * i + 2] = i + 2;
  }
  circleIndices[circleIndices.length - 1] = 1;
  circleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, circleIndices, gl.STATIC_DRAW);
  circleIndexBuf.itemsize = 1;
  circleIndexBuf.numItems = circleIndices.length;
}

function drawSquare(color, mMatrix, rendermode) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, sqBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    sqBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  gl.drawElements(rendermode, sqIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

function drawTriangle(color, mMatrix, rendermode) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    triangleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  gl.drawElements(rendermode, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

function drawCircle(color, mMatrix, rendermode) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    circleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // now draw the circle
  gl.drawElements(rendermode, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

////////////////////////////////////////////////////////////////////////
function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clearColor(0.0, 0.0, 1, 0.25);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // stop the current loop of animation
  if (animation) {
    window.cancelAnimationFrame(animation);
  }

  var animate = function () {
    gl.clearColor(0.0, 0.0, 1, 0.25);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.identity(mMatrix);
    // initialize the model matrix to identity matrix
    degree += 0.5;
    trans += sign * 0.005;
    if (trans >= 0.75 || trans <= -0.75) {
      sign = -sign;
    }

    //draw sun
    color = [1, 0.75, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.65, 0.75, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.35, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw sun line 1
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.65, 0.75, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.01, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw sun line 2
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.65, 0.75, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(36 + degree), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.01, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw sun line 3
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.65, 0.75, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(36 * 2 + degree), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.01, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw sun line 4
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.65, 0.75, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(36 * 3 + degree), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.01, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw sun line 5
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.65, 0.75, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(36 * 4 + degree), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.01, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw cloud 1
    color = [0, 0, 0, 0];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.85, 0.55, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.15, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw cloud 2
    color = [0, 0, 0, 0];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.75, 0.57, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.2, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw cloud 3
    color = [0, 0, 0, 0];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.6, 0.57, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.2, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw mountain 3 shadow
    color = [0.45, 0.25, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.58, 0.253, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-12.5), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.2, 0.45, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw mountain 3
    color = [0.85, 0.5, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.55, 0.25, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-5), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.2, 0.45, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw mountain 1 shadow
    color = [0.45, 0.25, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.195, 0.215, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(20), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.75, 0.75, 1.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-20), [0, 0, 1]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw mountain 1
    color = [0.85, 0.5, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.05, 0.25, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(20), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.75, 0.75, 1.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 0, 1]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw mountain 2
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.65, 0.25, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(5), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1, 0.35, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird wing 5 left
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.1315, 0.81, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-15), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.125 / 3, 0.02 / 3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird wing 5 right
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.1675, 0.81, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(15), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.125 / 3, 0.02 / 3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird body 5
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.15, 0.8, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.0175 / 3, 0.0175 / 3, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird wing 4 left
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.025, 0.71, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-15), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.125 / 2.5, 0.02 / 2.5, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird wing 4 right
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.0725, 0.71, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(15), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.125 / 2.5, 0.02 / 2.5, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird body 4
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.05, 0.7, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.0175 / 2.5, 0.0175 / 2.5, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird wing 3 left
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.34, 0.87, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-15), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.125 / 1.5, 0.02 / 1.5, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird wing 3 right
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.26, 0.87, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(15), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.125 / 1.5, 0.02 / 1.5, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird body 3
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.3, 0.85, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.0175 / 1.5, 0.0175 / 1.5, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird wing 2 right
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.0325, 0.865, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-15), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.125 / 2, 0.02 / 2, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);
    //bird wing 2 left
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.0325, 0.865, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(15), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.125 / 2, 0.02 / 2, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird body 2
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.0, 0.85, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.0175 / 2, 0.0175 / 2, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird wing 1 left
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.25, 0.775, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-15), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.125 / 1.25, 0.02 / 1.25, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird wing 1 right
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.15, 0.775, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(15), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.125 / 1.25, 0.02 / 1.25, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //bird body 1
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.2, 0.75, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.0175 / 1.25, 0.0175 / 1.25, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw grass
    color = [0, 1, 0, 0.9];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, -0.45, 0.0]);
    mMatrix = mat4.scale(mMatrix, [2, 1.175, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw path
    color = [0.5, 0.69, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.85, -0.75, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-30), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.95, 0.75, 1.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-50), [0, 0, 1]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw river
    color = [0, 0, 1, 0.75];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, -0.075, 0.0]);
    mMatrix = mat4.scale(mMatrix, [2, 0.35, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw tree trunk 1
    color = [0.4, 0.2, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.55, 0.35, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.05, 0.45, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw tree trunk 2
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.85, 0.3, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.05, 0.35, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw tree trunk 3
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.25, 0.3, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.05, 0.35, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //tree leaves 31
    color = [0, 0.5, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.85, 0.55, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //tree leaves 32
    color = [0, 0.75, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.85, 0.6, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.375, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //tree leaves 33
    color = [0, 0.95, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.85, 0.65, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //tree leaves 21
    color = [0, 0.5, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.55, 0.65, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.375, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //tree leaves 22
    color = [0, 0.75, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.55, 0.7, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.375, 0.375, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //tree leaves 23
    color = [0, 0.95, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.55, 0.75, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.375, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //tree leaves 11
    color = [0, 0.5, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.25, 0.55, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //tree leaves 12
    color = [0, 0.75, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.25, 0.6, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.375, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //tree leaves 13
    color = [0, 0.95, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.25, 0.65, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw river strip 1
    color = [0, 0, 0, 0];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.25, -0.2, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.005, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw river strip 2
    color = [0, 0, 0, 0];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.55, 0.05, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.005, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw river strip 3
    color = [0, 0, 0, 0];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.65, 0, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.005, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw boat triangle 1
    color = [1, 0, 0, 0.95];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.125 + trans, 0.125, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(270), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.25, 1.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(0), [0, 0, 1]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw boat pole slant
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.04 + trans, 0.1, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-15), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.0075, 0.35, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw boat pole
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0 + trans, 0.1, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.015, 0.35, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw boat triangle 1
    color = [0, 0, 0, 0.3];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.125 + trans, -0.1, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.075, -0.075, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw boat triangle 2
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.125 + trans, -0.1, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.075, -0.075, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw boat square
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0 + trans, -0.1, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.075, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw pole right
    color = [0, 0, 0, 0.85];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.65, -0.1, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.035, 0.65, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw pole left
    color = [0, 0, 0, 0.85];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.5, -0.1, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.035, 0.65, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw left pole triangle 1
    color = [1, 1, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.5, 0.25, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-degree * 2), [0, 0, 1]);
    mMatrix = mat4.translate(mMatrix, [0.15, 0, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw left pole triangle 2
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.5, 0.25, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-degree * 2 + 90), [0, 0, 1]);
    mMatrix = mat4.translate(mMatrix, [0.15, 0, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw left pole triangle 3
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.5, 0.25, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-degree * 2 + 180), [0, 0, 1]);
    mMatrix = mat4.translate(mMatrix, [0.15, 0, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw left pole triangle 4
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.5, 0.25, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-degree * 2 + 270), [0, 0, 1]);
    mMatrix = mat4.translate(mMatrix, [0.15, 0, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw right pole triangle 1
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.65, 0.25, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-degree * 2), [0, 0, 1]);
    mMatrix = mat4.translate(mMatrix, [0.15, 0, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw right pole triangle 2
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.65, 0.25, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-degree * 2 + 90), [0, 0, 1]);
    mMatrix = mat4.translate(mMatrix, [0.15, 0, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw right pole triangle 3
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.65, 0.25, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-degree * 2 + 180), [0, 0, 1]);
    mMatrix = mat4.translate(mMatrix, [0.15, 0, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw right pole triangle 4
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.65, 0.25, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-degree * 2 + 270), [0, 0, 1]);
    mMatrix = mat4.translate(mMatrix, [0.15, 0, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.3, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw pole circle left
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.5, 0.25, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.085, 0.085, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw pole circle right
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.65, 0.25, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.085, 0.085, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw grass left 2
    color = [0, 0.75, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.9, -0.425, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.175, 0.1, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw grass left 1
    color = [0, 0.55, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.8, -0.4, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.125, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw grass right 3
    color = [0, 0.4, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.05, -0.4, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 0.1, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw grass right 2
    color = [0, 0.75, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.25, -0.375, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 0.1, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw grass right 1
    color = [0, 0.575, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.135, -0.375, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.125, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw grass left ph 3
    color = [0, 0.4, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.1, -0.975, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.15, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw grass left ph 2
    color = [0, 0.85, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.25, -0.975, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.2, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw grass left ph 1
    color = [0, 0.575, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.1, -0.975, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.25, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw grass right ph 2
    color = [0, 0.6, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.8, -0.5, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.2, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw grass right ph 1
    color = [0, 0.45, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.95, -0.45, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.25, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw house
    color = [0, 0, 0, 0];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.5, -0.35, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.25, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw roof triangle 1
    color = [1, 0, 0, 0.85];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.25, -0.125, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw roof triangle 2
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.75, -0.125, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw roof square
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.5, -0.125, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.2, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw door
    color = [1, 0.75, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.5, -0.385, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.125, 0.175, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw window 1
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.35, -0.3, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw window 2
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.65, -0.3, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw car top triangle 1
    color = [1, 0, 0, 0.65];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.25, -0.7, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.2, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw car top triangle 2
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.45, -0.7, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.2, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw car top square
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.35, -0.65, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.1, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw left tire
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.5, -0.85, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.125, 0.125, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw right tire
    color = [0, 0, 0, 1];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.2, -0.85, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.125, 0.125, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw left tire in
    color = [0, 0, 0, 0.5];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.5, -0.85, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.085, 0.085, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw right tire in
    color = [0, 0, 0, 0.5];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.2, -0.85, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.085, 0.085, 1.0]);
    drawCircle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw car triangle 1
    color = [0, 0, 1, 0.65];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.175, -0.75, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 0.1, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw car triangle 2
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.525, -0.75, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 0.1, 1.0]);
    drawTriangle(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    //draw car square
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.35, -0.75, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.1, 1.0]);
    drawSquare(color, mMatrix, rendermode);
    mMatrix = popMatrix(matrixStack);

    animation = window.requestAnimationFrame(animate);
  };

  animate();
}

function changeRender(md) {
  rendermode = md;
  drawScene();
}

// This is the entry point from the html
function webGLStart() {
  var canvas = document.getElementById("exampleAnimation2D");
  initGL(canvas);
  shaderProgram = initShaders();

  //get locations of attributes declared in the vertex shader
  const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);

  uColorLoc = gl.getUniformLocation(shaderProgram, "color");

  initSquareBuffer();
  initTriangleBuffer();
  initCircleBuffer();
  rendermode = gl.TRIANGLES;
  drawScene();
}
