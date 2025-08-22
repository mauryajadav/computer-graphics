//draw square
var sqBuf;
var sqIndexBuf;
var sqNormalBuf;

function initSquareBuffer() {
  // buffer for point locations
  const sqVertices = new Float32Array([
    1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0,
  ]);
  sqBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqBuf);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  sqBuf.itemSize = 2;
  sqBuf.numItems = 4;

  //   var normals = [
  //     // Front face
  //     0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
  //     // Back face
  //     0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
  //   ];
  //   sqNormalBuf = gl.createBuffer();
  //   gl.bindBuffer(gl.ARRAY_BUFFER, sqNormalBuf);
  //   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  //   sqNormalBuf.itemSize = 3;
  //   sqNormalBuf.numItems = normals.length / 3;

  // buffer for point indices
  const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  sqIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
  sqIndexBuf.itemsize = 1;
  sqIndexBuf.numItems = 6;
}

function drawSquare(color) {
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

  gl.uniform4fv(uColorLocation, color);
  gl.uniform3fv(lightPosLocation, lightPos);
  gl.uniform1i(BounceVal, Bounce);
  gl.uniform1i(typepass, type);
  // now draw the square
  gl.drawElements(gl.TRIANGLES, sqIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}
