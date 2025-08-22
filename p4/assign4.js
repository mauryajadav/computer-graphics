////////////////////////////////////////////////////////////////////////
//  A simple WebGL program to draw a 3D cube wirh basic interaction.
//

var gl;
var canvas;
var matrixStack = [];

var type = 0;
var mode = 2;
var blend = 0;

var contrast = 0.0;
var brightness = 0.0;
var contrastSlider;
var brightnessSlider;

var aPositionLocation;
var aNormalLocation;
var aTexCoordLocation;
var uColorLocation;
var uMMatrixLocation;
var uMode;
var uBlend;
var uType;

var degree1 = 0.0;
var degree0 = 0.0;
var eyedegree = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;

var mMatrix = mat4.create(); // model matrix

var uTextureLocation;
var uForTextureLocation;

var texturePath = "sample_Textures/";
var background;
var alpha;
var backgroundtextureFile;
var alphatextureFile;

const phovertexShaderCode = `#version 300 es
precision mediump float;

in vec3 aPosition;
in vec2 aTexCoords;

out vec2 fragTexCoord;

uniform mat4 uMMatrix;

void main() {
    gl_Position = uMMatrix * vec4(aPosition, 1.0);

    fragTexCoord = aTexCoords;
}`;

const phofragShaderCode = ` #version 300 es
precision mediump float;

in vec2 fragTexCoord;

out vec4 fragColor;

uniform float contrast;
uniform float brightness;
uniform int mode;
uniform int blend;
uniform int type;
uniform sampler2D backTexture;
uniform sampler2D alphaTexture;
uniform vec4 objColor;

void main() {
    vec4 color ;
    vec4 backColor = texture(backTexture, fragTexCoord);
    vec4 alphaColor = texture(alphaTexture, fragTexCoord.xy);

    if(type==1){
      color = backColor;
      for(int i=-2;i<3;i++){
        for(int j=-2;j<3;j++){
          if(i==0 && j==0) continue;
          color += texture(backTexture, fragTexCoord+vec2(float(i)/800.0,float(j)/800.0));
        }
      }
      backColor = color/25.0;
    }else if(type==2){
      color = 5.0*backColor;
      for(int i=-1;i<2;i++){
        for(int j=-1;j<2;j++){
          if(i==0 && j==0){
            continue;
          }
          else if(i==0 || j==0){
            color -= texture(backTexture, fragTexCoord+vec2(float(i)/800.0,float(j)/800.0));
          }
        }
      }backColor=color;
    }else if(type==3){
      color = backColor;
      vec4 up = texture(backTexture, fragTexCoord+vec2(0.0/800.0,-1.0/800.0));
      vec4 down = texture(backTexture, fragTexCoord+vec2(0.0/800.0,1.0/800.0));
      vec4 right = texture(backTexture, fragTexCoord+vec2(1.0/800.0,0.0/800.0));
      vec4 left = texture(backTexture, fragTexCoord+vec2(-1.0/800.0,0.0/800.0));
      vec4 dx=(up-down)*0.5;
      vec4 dy=(right-left)*0.5;
      vec4 grad=sqrt(dx*dx+dy*dy);
      backColor=1.5*grad;
      backColor.a=1.0;
    }else if(type==4){
      color = 4.0*backColor;
      for(int i=-1;i<2;i++){
        for(int j=-1;j<2;j++){
          if(i==0 && j==0){
            continue;
          }
          else if(i==0 || j==0){
            color -= texture(backTexture, fragTexCoord+vec2(float(i)/800.0,float(j)/800.0));
          }
        }
      }backColor=1.5*color;
      backColor.a=1.0;
    }

    vec4 texColor=backColor;
    if(blend==1){
        texColor = vec4(alphaColor.rgb*alphaColor.a+backColor.rgb*(1.0-alphaColor.a),1.0);
    }

    if(mode==0){
      float graysc = texColor.r*0.2126+texColor.g*0.7152+texColor.b*0.0722;
      color = vec4(graysc, graysc, graysc, texColor.a);
    }
    else if(mode==1){
      float sepiaR=0.393*texColor.r + 0.769*texColor.g + 0.189*texColor.b;
      float sepiaG=0.349*texColor.r + 0.686*texColor.g + 0.168*texColor.b;
      float sepiaB=0.272*texColor.r + 0.534*texColor.g + 0.131*texColor.b;
      color = vec4(sepiaR, sepiaG, sepiaB, texColor.a);
    }else{
      color = texColor;
    }
    color.rgb = (color.rgb - 0.5) * (contrast + 1.0) + 0.5;
    fragColor = color+brightness;

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
    gl.RGBA, // internal format
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type of data
    texture.image // array or <img>
  );

  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );

  drawScene();
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2",{preserveDrawingBuffer: true}); // the graphics webgl2 context
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
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var color = [0.0, 0.0, 0.0, 1];

  mat4.identity(mMatrix);
  pushMatrix(matrixStack, mMatrix);

  gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
  gl.bindTexture(gl.TEXTURE_2D, alpha); // bind the texture object
  gl.uniform1i(uForTextureLocation, 1); // pass the texture unit

  gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
  gl.bindTexture(gl.TEXTURE_2D, background); // bind the texture object
  gl.uniform1i(uTextureLocation, 2); // pass the texture unit

  mMatrix = mat4.scale(mMatrix, [2, 2, 0]);
  drawCube(color);
  mMatrix = popMatrix(matrixStack);
}
//////////////////////////////////////////////////////////////////////
function backgroundImage() {
  var backfile = document.getElementById("backgroundInput");
  backgroundtextureFile = texturePath.concat(backfile.files[0].name);
  background = initTextures(backgroundtextureFile);
  drawScene();
}

function foregroundImage() {
  var forfile = document.getElementById("foregroundInput");
  alphatextureFile = texturePath.concat(forfile.files[0].name);
  alpha = initTextures(alphatextureFile);
  drawScene();
}

//////////////////////////////////////////////////////////////////////

function backgroundChanger() {
  var checkbox1 = document.getElementById("background");
  var checkbox2 = document.getElementById("alpha");
  if (checkbox1.checked) {
    blend = 0;
    checkbox2.checked = false;
  } else {
    blend = 1;
  }
  if (!checkbox1.checked && !checkbox2.checked) {
    blend = 0;
    checkbox1.checked = true;
  }
  drawScene();
}

function alphaChanger() {
  var checkbox1 = document.getElementById("background");
  var checkbox2 = document.getElementById("alpha");
  if (checkbox2.checked) {
    blend = 1;
    checkbox1.checked = false;
  } else {
    blend = 0;
  }
  if (!checkbox1.checked && !checkbox2.checked) {
    blend = 0;
    checkbox1.checked = true;
  }
  drawScene();
}

//////////////////////////////////////////////////////////////////////

function grayChanger() {
  var checkbox1 = document.getElementById("gray");
  var checkbox2 = document.getElementById("sepia");
  if (checkbox1.checked) {
    mode = 0;
    checkbox2.checked = false;
  } else {
    mode = 2;
  }
  drawScene();
}

function sepiaChanger() {
  var checkbox1 = document.getElementById("gray");
  var checkbox2 = document.getElementById("sepia");
  if (checkbox2.checked) {
    mode = 1;
    checkbox1.checked = false;
  } else {
    mode = 2;
  }
  drawScene();
}

//////////////////////////////////////////////////////////////////////

function contrastChanged() {
  contrast = parseFloat(contrastSlider.value);
  drawScene();
}

function brightnessChanged() {
  brightness = parseFloat(brightnessSlider.value);
  drawScene();
}

//////////////////////////////////////////////////////////////////////

function smoothChanger() {
  var checkbox1 = document.getElementById("smooth");
  var checkbox2 = document.getElementById("sharpen");
  var checkbox3 = document.getElementById("gradient");
  var checkbox4 = document.getElementById("laplacian");
  if (checkbox1.checked) {
    type = 1;
    checkbox2.checked = false;
    checkbox3.checked = false;
    checkbox4.checked = false;
  } else {
    type = 0;
  }
  drawScene();
}

function sharpenChanger() {
  var checkbox1 = document.getElementById("smooth");
  var checkbox2 = document.getElementById("sharpen");
  var checkbox3 = document.getElementById("gradient");
  var checkbox4 = document.getElementById("laplacian");
  if (checkbox2.checked) {
    type = 2;
    checkbox1.checked = false;
    checkbox3.checked = false;
    checkbox4.checked = false;
  } else {
    type = 0;
  }
  drawScene();
}

function gradientChanger() {
  var checkbox1 = document.getElementById("smooth");
  var checkbox2 = document.getElementById("sharpen");
  var checkbox3 = document.getElementById("gradient");
  var checkbox4 = document.getElementById("laplacian");
  if (checkbox3.checked) {
    type = 3;
    checkbox1.checked = false;
    checkbox2.checked = false;
    checkbox4.checked = false;
  } else {
    type = 0;
  }
  drawScene();
}

function laplacianChanger() {
  var checkbox1 = document.getElementById("smooth");
  var checkbox2 = document.getElementById("sharpen");
  var checkbox3 = document.getElementById("gradient");
  var checkbox4 = document.getElementById("laplacian");
  if (checkbox4.checked) {
    type = 4;
    checkbox1.checked = false;
    checkbox2.checked = false;
    checkbox3.checked = false;
  } else {
    type = 0;
  }
  drawScene();
}

function reset() {
  var checkbox1 = document.getElementById("smooth");
  var checkbox2 = document.getElementById("sharpen");
  var checkbox3 = document.getElementById("gradient");
  var checkbox4 = document.getElementById("laplacian");
  var checkbox5 = document.getElementById("gray");
  var checkbox6 = document.getElementById("sepia");
  var checkbox7 = document.getElementById("background");
  var checkbox8 = document.getElementById("alpha");
  checkbox1.checked = false;
  checkbox2.checked = false;
  checkbox3.checked = false;
  checkbox4.checked = false;
  checkbox5.checked = false;
  checkbox6.checked = false;
  checkbox7.checked = true;
  checkbox8.checked = false;
  contrastSlider.value = 0.0;
  brightnessSlider.value = 0.0;
  type = 0;
  mode = 2;
  blend = 0;
  contrast = 0.0;
  brightness = 0.0;

  drawScene();
}

function save(){
  var link = document.createElement('a');
  link.download = 'image.png';
  link.href = canvas.toDataURL('image/png')
  link.click();
}
//////////////////////////////////////////////////////////////////////

// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("assignment4");
  contrastSlider = document.getElementById("contrast");
  contrastSlider.addEventListener("input", contrastChanged);

  brightnessSlider = document.getElementById("brightness");
  brightnessSlider.addEventListener("input", brightnessChanged);
  // initialize WebGL
  initGL(canvas);
  // initialize shader program

  initCubeBuffer();

  shaderProgram = initShaders();
  background = initTextures(backgroundtextureFile);
  alpha = initTextures(alphatextureFile);

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");

  uMode = gl.getUniformLocation(shaderProgram, "mode");
  uBlend = gl.getUniformLocation(shaderProgram, "blend");
  uContrast = gl.getUniformLocation(shaderProgram, "contrast");
  uBrightness = gl.getUniformLocation(shaderProgram, "brightness");
  uType = gl.getUniformLocation(shaderProgram, "type");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

  uTextureLocation = gl.getUniformLocation(shaderProgram, "backTexture");
  uForTextureLocation = gl.getUniformLocation(shaderProgram, "alphaTexture");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  gl.enableVertexAttribArray(aTexCoordLocation);

  drawScene();
}
