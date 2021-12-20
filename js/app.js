// getCurrentParameters
// parameters:        https://rawgit.com/auduno/clmtrackr/gh-pages/examples/modelviewer_pca.html
// point numbering:   https://www.auduno.com/clmtrackr/examples/media/facemodel_numbering_new.png

// component 1 is rotation along vert
//component 2 is rotation along horizont


function PuppetMaster(puppet,toTrack){

  var ctracker = this.ctracker =  new clm.tracker();
  ctracker.init(pModel);

  //draw face on canvas

  var c=toTrack;
  var out = document.getElementById("outcanvas");
  var outCtx = out.getContext('2d');

  run();

  function run(){

    c.height = out.height = toTrack.height;
    c.width = out.width = toTrack.width;

    ctracker.start(c);

    puppet.init(function(er){
      if(er){console.error(er)}
      track();
    });

  }

  var position = {};
  var rotation = {};
  var translation = {
      position:position,
      rotation:rotation
    }

  function track(t){
    t = t || 0;

    var positions = ctracker.getCurrentPosition();
    var params = ctracker.getCurrentParameters();
    var score = ctracker.getScore();

    outCtx.clearRect(0,0,out.width,out.height);
    ctracker.draw(out);

    requestAnimationFrame(track);
    if (!positions || !params){
      console.info('no positions yet');
      return;
    }

    // rotation is along axis
    rotation.x = params[1]* Math.PI/180;
    rotation.y = params[0]* Math.PI/180;

    //z rotation based on eyes
    rotation.z = -1 * Math.atan2(
      positions[32][1] - positions[27][1],
      positions[32][0] - positions[27][0]
    )

    // positions are -1...1 based on eyes
    position.x = (( positions[27][0] + positions[32][0] ) / out.width) - 1;
    position.y = (( positions[27][1] + positions[32][1] ) / out.height) - 1;

    // Z position: eyes won't work tbh.
    var dx = positions[27][0] - positions[32][0];
    var dy = positions[27][1] - positions[32][1];

    var eyeSeperation = ctracker.eyeSeperation = Math.sqrt(dx*dx+dy*dy);

    position.z =  -1*(out.width / eyeSeperation - 1);


    puppet.draw(translation,ctracker);

  }

}

// puppet

function DuckPuppet(){

  var self = this;
  var container, camera, scene, mesh, mixer, renderer, parentObject;
  var BASE_FOV = 80;//this isn't really FOV in degrees.  This times pi / 4 = FOV
  var clock = new THREE.Clock();
  var animationSpeed = 1;
  var materialType = THREE.MeshLambertMaterial;

  window.scene = scene;


  this.draw = function(translation,model){

    var translateScale = 5;
    var smoothRate = 0.3;

    targetPos = [
      translation.position.x*translateScale,
      -translation.position.y*translateScale,// y is inverted
      translation.position.z/2
    ];

    //confirmed: z=z
    targetRot = [0,0,translation.rotation.z];

    //smooth it out
    parentObject.position.set(
      targetPos[0]*smoothRate + parentObject.position.x*(1-smoothRate),
      targetPos[1]*smoothRate + parentObject.position.y*(1-smoothRate),
      targetPos[2]*smoothRate + parentObject.position.z*(1-smoothRate)
    );

    parentObject.rotation.set(
      targetRot[0]*smoothRate + parentObject.rotation.x*(1-smoothRate),
      targetRot[1]*smoothRate + parentObject.rotation.y*(1-smoothRate),
      targetRot[2]*smoothRate + parentObject.rotation.z*(1-smoothRate)
    );

    //move beakl

    var positions = model.getCurrentPosition();

    var dx = positions[60][0] - positions[57][0];
    var dy = positions[60][1] - positions[57][1];
    var lipDist = Math.sqrt(dx*dx+dy*dy);
    var mouthOpenness = 1.5*Math.max(0,
      2*lipDist / model.eyeSeperation -0.2
    ); // about 0.. 0.5
    var beakL = mesh.skeleton.bones[13];

    beakL.rotation.set(-mouthOpenness * smoothRate+beakL.rotation.x*(1-smoothRate),0,0);

  }

  this.init = function(callback){

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 0, 6);

    scene = new THREE.Scene();

    var skyMatl = new THREE.MeshLambertMaterial({side:THREE.BackSide,fog:false,color:0x7992A9});
    var skyDome = new THREE.Mesh( new THREE.SphereGeometry( 300, 20, 10 ), skyMatl );
    scene.add(skyDome);

    var loader = new THREE.JSONLoader();
    loader.load('models/duck-rigged-2anims.json', function (geometry, materials) {

      var material = materials[0];
      material.skinning = true;

      var faceMaterial = new THREE.MeshFaceMaterial(materials,{side:THREE.DoubleSide});

      mesh = new THREE.SkinnedMesh(geometry, faceMaterial);

      var s = 1;
      mesh.scale.set( s, s, s );

      mesh.position.set(0, -10, 0);
      mesh.rotation.y = Math.PI;

      // meshs parent
      parentObject = new THREE.Object3D();
      parentObject.add(mesh);

      //mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();

      scene.add(parentObject);

      mixer = new THREE.AnimationMixer(mesh);
      //mixer.addAction(new THREE.AnimationAction(mesh.geometry.animations[2]));

      var light = new THREE.AmbientLight( 0x999999 ); // soft white light
      scene.add( light );

      var light = new THREE.DirectionalLight( {color:0x999999} ); // soft white light
      scene.add( light );

      	// Renderer
      renderer = new THREE.WebGLRenderer();
      renderer.setPixelRatio(window.devicePixelRatio);

      //renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);

      self.animate();

      self.onWindowResize();//call on construct

      callback(null);

    });


  }

  this.animate = function() {

    requestAnimationFrame(self.animate);

    //mesh.skeleton.bones[3].rotation.y+=.1;

    var delta = clock.getDelta();

    mixer.update(delta * animationSpeed);

    /*
    if (controls){
      controls.update;
    }
    */

    self.render();
    //stats.update();
  }

  this.render = function() {
    if (renderer){
      renderer.render(scene, camera);
    }
  }

  self.onWindowResize = function(event) {

    if (camera){
      //set vertical FOV
      camera.fov =  BASE_FOV * Math.atan2(window.innerHeight, window.innerWidth);

      if (renderer){
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
  }

  //window.addEventListener('resize', self.onWindowResize, false);
  self.onWindowResize();//call on construct

}


//run it

var toTrack = document.getElementById('videoel');

var pm = new PuppetMaster(new DuckPuppet(),toTrack);
