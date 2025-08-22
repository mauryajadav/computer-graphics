////////////////////////////////////////////////////////////////////////
//  A simple WebGL program to draw a 3D cube wirh basic interaction.
//

var gl;
var canvas;
var matrixStack = [];

var type = 0;
var mode = 0;
var lightPos = [0.0, 4.0, 4.0];
var lightPosLocation;
var aPositionLocation;
var aNormalLocation;
var aTexCoordLocation;
var uColorLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;
var uMode;
var uType;
var animation;

var degree1 = 0.0;
var degree0 = 0.0;
var eyedegree = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;

// initialize model, view, and projection matrices
var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix

// specify camera/eye coordinate system parameters
var eyePosLocation;
var eyePos = [0.0, 0.0, 3.5];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

var zAngle = 0.0;
var yAngle = 0.0;

var uTextureLocation;
var uCubeMapLocation;
var woodTexture;
var rcubeTexture;
var cubemapTexture;
var woodtextureFile = "wood_texture.jpg";
var rcubetextureFile = "rcube.png";

var cubeMapPath = "Nvidia_cubemap/";
var posx, posy, posz, negx, negy, negz;

var posx_file = cubeMapPath.concat("posx.jpg");
var posy_file = cubeMapPath.concat("posy.jpg");
var posz_file = cubeMapPath.concat("posz.jpg");
var negx_file = cubeMapPath.concat("negx.jpg");
var negy_file = cubeMapPath.concat("negy.jpg");
var negz_file = cubeMapPath.concat("negz.jpg");

const phovertexShaderCode = `#version 300 es
precision mediump float;

in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoords;

out vec3 fragNormal;
out vec3 fragLightDir;
out vec3 fragViewDir;
out vec2 fragTexCoord;
out vec3 v_worldPosition;
out vec3 v_worldNormal;

uniform vec3 lightPos;
uniform vec3 eyePos;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

void main() {
    mat4 uWNMatrix = transpose(inverse(uMMatrix));

    v_worldPosition = mat3(uMMatrix) * aPosition;
    v_worldNormal = mat3(uWNMatrix) * aNormal;

    mat4 projectionModelView = uPMatrix * uVMatrix * uMMatrix;
    gl_Position = projectionModelView * vec4(aPosition, 1.0);

    vec3 posInEyeSpace = vec3(uVMatrix* uMMatrix * vec4(aPosition, 1.0));

    vec3 lightPosEyeSpace = (uVMatrix * vec4(-lightPos, 1.0)).xyz;

    vec3 lightDir = normalize(-lightPosEyeSpace - posInEyeSpace);

    vec3 normal = normalize(mat3(transpose(inverse(uVMatrix * uMMatrix))) * aNormal);
    vec3 R = normalize(-reflect(lightDir, normal));

    vec3 viewDir = normalize(-posInEyeSpace);

    fragTexCoord = aTexCoords;
    fragNormal = normal;
    fragLightDir = lightDir;
    fragViewDir = viewDir;
}`;

const phofragShaderCode = ` #version 300 es
precision mediump float;

in vec2 fragTexCoord;
in vec3 fragNormal;
in vec3 fragLightDir;
in vec3 fragViewDir;
in vec3 v_worldPosition;
in vec3 v_worldNormal;

out vec4 fragColor;

uniform int mode;
uniform int type;
uniform vec3 eyePos;
uniform samplerCube cubeMap;
uniform sampler2D imageTexture;
uniform vec4 objColor;

void main() {
    vec3 worldNormal = normalize(v_worldNormal);
    vec3 eyeToSurfaceDir = normalize(v_worldPosition - eyePos);

    vec3 directionReflection = reflect(eyeToSurfaceDir,worldNormal);
    vec3 directionRefraction = refract(eyeToSurfaceDir,worldNormal,0.82);
    vec4 color = objColor;
    vec4 textureColor;
    vec4 cubeMapReflectCol;

    if(mode == 0){
    cubeMapReflectCol = texture(cubeMap, directionReflection);
    textureColor = texture(imageTexture, fragTexCoord);
    fragColor = mix(textureColor, cubeMapReflectCol, 0.5);
    }else if(mode == 1){
    textureColor = texture(imageTexture, fragTexCoord);
    fragColor = textureColor;
    }else if(mode == 2){
    cubeMapReflectCol = texture(cubeMap, directionReflection);
    fragColor = cubeMapReflectCol;
    }else if(mode == 3){
    cubeMapReflectCol = texture(cubeMap, directionRefraction);
    fragColor = cubeMapReflectCol;

    }else{

    }

    if(type == 1){
      color=fragColor;
      vec4 Iamb = vec4(0.2, 0.2, 0.2, 1.0) * color;
      vec4 Idiff = color * max(dot(fragNormal, fragLightDir), 0.0);
      vec4 Ispec =5.0* color * pow(max(dot(fragViewDir, reflect(-fragLightDir, fragNormal)), 0.0), 50.0);
      fragColor = Iamb + Idiff + Ispec ;
    }else if(type == 2){
      color+=fragColor;
      vec4 Iamb = vec4(0.2, 0.2, 0.2, 1.0) * color;
      vec4 Idiff = color * max(dot(fragNormal, fragLightDir), 0.0);
      vec4 Ispec = 5.0 *color * pow(max(dot(fragViewDir, reflect(-fragLightDir, fragNormal)), 0.0), 50.0);
      fragColor = Iamb + Idiff + Ispec ;
    }else{

    }

}`;

//////////////////////////////////////////////////////////////////////

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

function initCubeMap() {
  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: posx_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: negx_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: posy_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: negy_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: posz_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: negz_file,
    },
  ];
  cubemapTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
  faceInfos.forEach((faceInfo) => {
    const { target, url } = faceInfo;
    //set each face
    gl.texImage2D(
      target,
      0,
      gl.RGBA,
      512,
      512,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );

    //load images
    const image = new Image();
    image.src = url;
    image.addEventListener("load", function () {
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      drawScene();
    });
  });

  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(
    gl.TEXTURE_CUBE_MAP,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
}

function initTextures(textureFile) {
  var tex = gl.createTexture();
  tex.image = new Image();
  tex.image.src = textureFile;
  tex.image.onload = function () {
    handleTextureLoaded(tex);
  };
  return tex;
}

function handleTextureLoaded(texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // use it to flip Y if needed
  gl.texImage2D(
    gl.TEXTURE_2D, // 2D texture
    0, // mipmap level
    gl.RGB, // internal format
    gl.RGB, // format
    gl.UNSIGNED_BYTE, // type of data
    texture.image // array or <img>
  );

  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );

  drawScene();
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
  if (animation) {
    window.cancelAnimationFrame(animation);
  }

  var animate = function () {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.8, 0.8, 0.8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eyedegree += 0.015;
    var eye = 3.5;
    eyePos = [eye * Math.sin(eyedegree), eyePos[1], eye * Math.cos(eyedegree)];
    //set up view matrix
    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

    //set up perspective projection matrix
    mat4.identity(pMatrix);
    mat4.perspective(60, 1.0, 0.1, 1000, pMatrix);
    var color = [0.0, 0.0, 0.0, 1];

    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);

    mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [1, 0, 0]);
    mMatrix = mat4.translate(mMatrix, [0.0, -1.0, 0.0]);

    //back cube
    mode = 1;
    type = 0;
    pushMatrix(matrixStack, mMatrix);

    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, negz); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object
    gl.uniform1i(uCubeMapLocation, 2); // pass the texture unit

    mMatrix = mat4.translate(mMatrix, [0, 0, -200]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [-400, 400, 0]);
    drawSquare(color);
    mMatrix = popMatrix(matrixStack);

    //front cube
    pushMatrix(matrixStack, mMatrix);

    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, posz); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object
    gl.uniform1i(uCubeMapLocation, 2); // pass the texture unit

    mMatrix = mat4.translate(mMatrix, [0, 0, 200]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [400, 400, 0]);
    drawSquare(color);
    mMatrix = popMatrix(matrixStack);

    //left cube
    pushMatrix(matrixStack, mMatrix);

    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, posx); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object
    gl.uniform1i(uCubeMapLocation, 2); // pass the texture unit

    mMatrix = mat4.translate(mMatrix, [200, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 1, 0]);
    mMatrix = mat4.scale(mMatrix, [-400, -400, 0]);
    drawSquare(color);
    mMatrix = popMatrix(matrixStack);

    //right cube
    pushMatrix(matrixStack, mMatrix);

    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, negx); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object
    gl.uniform1i(uCubeMapLocation, 2); // pass the texture unit

    mMatrix = mat4.translate(mMatrix, [-200, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 1, 0]);
    mMatrix = mat4.scale(mMatrix, [-400, 400, 0]);
    drawCube(color);
    mMatrix = popMatrix(matrixStack);

    //bottom cube
    pushMatrix(matrixStack, mMatrix);

    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, negy); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object
    gl.uniform1i(uCubeMapLocation, 2); // pass the texture unit

    mMatrix = mat4.translate(mMatrix, [0, -200, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [1, 0, 0]);
    mMatrix = mat4.scale(mMatrix, [-400, -400, 0]);
    drawSquare(color);
    mMatrix = popMatrix(matrixStack);

    //top cube
    pushMatrix(matrixStack, mMatrix);

    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, posy); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object
    gl.uniform1i(uCubeMapLocation, 2); // pass the texture unit

    mMatrix = mat4.translate(mMatrix, [0, 200, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-90), [1, 0, 0]);
    mMatrix = mat4.scale(mMatrix, [-400, -400, 0]);
    drawSquare(color);
    mMatrix = popMatrix(matrixStack);

    //table base
    mode = 0;
    type = 0;
    pushMatrix(matrixStack, mMatrix);
    gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
    gl.bindTexture(gl.TEXTURE_2D, woodTexture); // bind the texture object to the texture unit
    gl.uniform1i(uTextureLocation, 0); // pass the texture unit

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object
    gl.uniform1i(uCubeMapLocation, 2); // pass the texture unit

    mMatrix = mat4.scale(mMatrix, [2.0, 0.025, 1.5]);
    drawSphere(color);
    mMatrix = popMatrix(matrixStack);

    //table leg 1
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(30), [0, 1, 0]);
    mMatrix = mat4.translate(mMatrix, [1.5, -1.25, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 2.5, 0.15]);
    drawCube(color);
    mMatrix = popMatrix(matrixStack);

    //table leg 2
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(-30), [0, 1, 0]);
    mMatrix = mat4.translate(mMatrix, [1.5, -1.25, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 2.5, 0.15]);
    drawCube(color);
    mMatrix = popMatrix(matrixStack);

    //table leg 3
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(210), [0, 1, 0]);
    mMatrix = mat4.translate(mMatrix, [1.5, -1.25, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 2.5, 0.15]);
    drawCube(color);
    mMatrix = popMatrix(matrixStack);

    //table leg 4
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(150), [0, 1, 0]);
    mMatrix = mat4.translate(mMatrix, [1.5, -1.25, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 2.5, 0.15]);
    drawCube(color);
    mMatrix = popMatrix(matrixStack);

    //teapot
    mode = 2;
    type = 0;
    pushMatrix(matrixStack, mMatrix);
    gl.activeTexture(gl.TEXTURE3); // set texture unit 0 to use
    gl.bindTexture(gl.TEXTURE_2D, woodTexture); // bind the texture object to the texture unit
    gl.uniform1i(uTextureLocation, 3); // pass the texture unit

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object
    gl.uniform1i(uCubeMapLocation, 2); // pass the texture unit

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.5, 0.5, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.06, 0.06, 0.06]);
    drawObject(color);
    mMatrix = popMatrix(matrixStack);

    //rcube
    mode = 1;
    type = 0;
    pushMatrix(matrixStack, mMatrix);
    gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
    gl.bindTexture(gl.TEXTURE_2D, rcubeTexture); // bind the texture object to the texture unit
    gl.uniform1i(uTextureLocation, 0); // pass the texture unit

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object
    gl.uniform1i(uCubeMapLocation, 2); // pass the texture unit

    mMatrix = mat4.translate(mMatrix, [-0.5, 0.25, 1.0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);
    drawCube(color);
    mMatrix = popMatrix(matrixStack);

    //cube
    mode = 3;
    type = 0;
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-1, 0.5, 0.25]);
    mMatrix = mat4.scale(mMatrix, [0.6, 1.0, 0.6]);
    drawCube(color);
    mMatrix = popMatrix(matrixStack);

    mMatrix = popMatrix(matrixStack);

    //sphere 1
    mode = 2;
    type = 2;
    pushMatrix(matrixStack, mMatrix);
    gl.activeTexture(gl.TEXTURE3); // set texture unit 0 to use
    gl.bindTexture(gl.TEXTURE_2D, rcubeTexture); // bind the texture object to the texture unit
    gl.uniform1i(uTextureLocation, 3); // pass the texture unit

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object
    gl.uniform1i(uCubeMapLocation, 2); // pass the texture unit

    mMatrix = mat4.translate(mMatrix, [0.5, 0.3, 1.0]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
    color = [0.0, 0.0, 0.85, 1.0];
    drawSphere(color);
    mMatrix = popMatrix(matrixStack);

    //sphere 2
    pushMatrix(matrixStack, mMatrix);
    gl.activeTexture(gl.TEXTURE3); // set texture unit 0 to use
    gl.bindTexture(gl.TEXTURE_2D, rcubeTexture); // bind the texture object to the texture unit
    gl.uniform1i(uTextureLocation, 3); // pass the texture unit

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object
    gl.uniform1i(uCubeMapLocation, 2); // pass the texture unit

    mMatrix = mat4.translate(mMatrix, [-0.5, 0.25, -0.75]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
    color = [0.85, 0.0, 0.0, 1.0];
    drawSphere(color);
    mMatrix = popMatrix(matrixStack);

    animation = window.requestAnimationFrame(animate);
  };
  animate();
}
//////////////////////////////////////////////////////////////////////

// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("assignment3");
  document.addEventListener("mousedown", onMouseDown, false);
  // initialize WebGL
  initGL(canvas);
  // initialize shader program
  initCubeMap();
  posx = initTextures(posx_file);
  posy = initTextures(posy_file);
  posz = initTextures(posz_file);
  negz = initTextures(negz_file);
  negx = initTextures(negx_file);
  negy = initTextures(negy_file);

  initCubeBuffer();
  initSquareBuffer();
  initSphereBuffer();
  initObject();
  shaderProgram = initShaders();
  rcubeTexture = initTextures(rcubetextureFile);
  woodTexture = initTextures(woodtextureFile);

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

  lightPosLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  eyePosLocation = gl.getUniformLocation(shaderProgram, "eyePos");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");

  uMode = gl.getUniformLocation(shaderProgram, "mode");
  uType = gl.getUniformLocation(shaderProgram, "type");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");

  uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
  uCubeMapLocation = gl.getUniformLocation(shaderProgram, "cubeMap");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  gl.enableVertexAttribArray(aTexCoordLocation);

  drawScene();
}

//////////////////////////////////////////////////////////////////////

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
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;
    degree0 = degree0 + diffX1 / 5;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;
    degree1 = degree1 - diffY2 / 5;

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
